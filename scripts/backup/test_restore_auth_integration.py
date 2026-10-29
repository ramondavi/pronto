"""Opt-in integration, restricted to the labelled disposable fixture source.

The source must contain only the six repository test accounts and migrations.
No remote connection or project credential is accepted. Auth output is suppressed.
"""
from pathlib import Path
import json,os,re,secrets,subprocess,sys,tempfile,unittest
sys.path.insert(0,'scripts/backup')
import psycopg
import run_backup as backup
from restore_drill import OfflineDatabase,unpack_verified,local_command
from restore_auth import OfflineAuth,FIXTURE_IDS,prepare_offline_fixture
from unittest.mock import patch
from datetime import datetime,timezone

def exercise(state_path):
    state=json.loads(Path(state_path).read_text())
    require=backup.require
    require(state.get('ready') and re.fullmatch(r'pronto-auth-drill-[0-9a-f]{10}',state['project']),'synthetic_source_not_ready')
    info=json.loads(subprocess.check_output(['docker','inspect',state['container']]))[0]
    require(info['Config']['Labels'].get('pronto.auth.fixture')==state['project'],'synthetic_source_not_owned')
    bindings=info['NetworkSettings']['Ports']['5432/tcp']
    require(all(b['HostIp']=='127.0.0.1' and b['HostPort']=='55442' for b in bindings),'synthetic_source_not_loopback')
    connect=lambda:psycopg.connect(host='127.0.0.1',port=55442,user='supabase_admin',password='postgres',dbname='postgres',sslmode='disable',autocommit=True)
    password=secrets.token_urlsafe(24)
    with connect() as db:
        existing=db.execute('SELECT id::text FROM auth.users ORDER BY id').fetchall()
        if not existing:
            text=Path('supabase/tests/database/authorization_rls.test.sql').read_text()
            setup=text[text.index('insert into auth.users'):text.index('set local role authenticated;')]
            db.execute(setup)
        else:
            require({row[0] for row in existing}==set(FIXTURE_IDS),'synthetic_source_accounts_unexpected')
        if db.execute("SELECT EXISTS(SELECT FROM pg_namespace WHERE nspname='supabase_functions')").fetchone()[0]:
            require(db.execute('SELECT count(*) FROM supabase_functions.hooks').fetchone()[0]==0,'synthetic_source_has_webhooks')
            db.execute('DROP SCHEMA supabase_functions CASCADE')
        db.execute("UPDATE auth.users SET encrypted_password=extensions.crypt(%s,extensions.gen_salt('bf',10)),aud='authenticated',role='authenticated',email_confirmed_at=now(),confirmation_token='',recovery_token='',email_change_token_new='',email_change='',raw_app_meta_data='{"+'"provider":"email","providers":["email"]'+"}'::jsonb,created_at=now(),updated_at=now() WHERE id=ANY(%s)",(password,list(FIXTURE_IDS)))
        columns={row[0] for row in db.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'").fetchall()}
        for column in ('email_change_token_current','reauthentication_token','phone_change','phone_change_token'):
            if column in columns:
                db.execute('UPDATE auth.users SET "'+column+'"=%s WHERE id=ANY(%s)',('',list(FIXTURE_IDS)))
        db.execute("UPDATE auth.users SET instance_id='00000000-0000-0000-0000-000000000000' WHERE id=ANY(%s)",(list(FIXTURE_IDS),))
        db.execute("INSERT INTO auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at) SELECT extensions.gen_random_uuid(),id::text,id,jsonb_build_object('sub',id::text,'email',email,'email_verified',true),'email',now(),now() FROM auth.users u WHERE id=ANY(%s) AND NOT EXISTS(SELECT FROM auth.identities i WHERE i.user_id=u.id AND i.provider='email')",(list(FIXTURE_IDS),))
        require(db.execute('SELECT count(*) FROM auth.users').fetchone()[0]==6,'synthetic_source_setup_failed')
    print('fixture_accounts_prepared',flush=True)
    now=datetime.now(timezone.utc)
    with tempfile.TemporaryDirectory() as directory:
        folder=Path(directory);payload=folder/'payload';payload.mkdir()
        identity=local_command(['age-keygen']);recipient=local_command(['age-keygen','-y'],data=identity).decode().strip()
        env={'BACKUP_SOURCE_ID':'pronto-production','BACKUP_AGE_RECIPIENT':recipient,'PGHOST':'127.0.0.1','PGPORT':'55442','PGDATABASE':'postgres','PGUSER':'supabase_admin','PGPASSWORD':'postgres','PGSSLMODE':'disable'}
        with patch.dict('os.environ',env),connect() as connection:
            snapshot=backup.DatabaseSnapshot(connection,payload);snapshot.start();fingerprint=snapshot.fingerprint()
            archive=backup.encrypted_snapshot(snapshot,connect,payload,folder,fingerprint,now)
        plain=folder/'plain.tar.gz';local_command(['age','-d','-i','-','-o',plain,archive],data=identity)
        root,manifest=unpack_verified(plain,folder/'out',{'fingerprint':fingerprint,'created_at':now.isoformat()})
        with OfflineDatabase(auth_tools=True) as database:
            tables=database.restore(root,manifest)
            print('synthetic_database_restored',flush=True)
            with OfflineAuth(database,os.environ['BACKUP_AUTH_TEST_BINARY']) as auth:
                print('isolated_auth_ready',flush=True)
                result=auth.verify_fixture(password)
            # Only this labelled, all-synthetic source is accepted above. Reset
            # its disposable restored fixture to exercise post-verification seeding.
            require(database.sql("SELECT count(*) FROM auth.users").strip()==b"6", "synthetic_accounts_unexpected")
            database.sql("TRUNCATE auth.users, public.academic_programs CASCADE")
            new_password=prepare_offline_fixture(database)
            with OfflineAuth(database,os.environ['BACKUP_AUTH_TEST_BINARY']) as auth:
                result=auth.verify_fixture(new_password)
            result['post_restore_fixture_creation_verified']=True
        result['tables_verified']=tables;result['container_removed']=database.cleaned;result['synthetic_only']=True
    return result
@unittest.skipUnless(os.environ.get("BACKUP_AUTH_INTEGRATION_STATE"), "explicit owned synthetic source required")
class AuthRoundtripTest(unittest.TestCase):
    def test_password_sessions_and_profile_rls_after_encrypted_roundtrip(self):
        result = exercise(os.environ["BACKUP_AUTH_INTEGRATION_STATE"])
        self.assertEqual(result["synthetic_logins_verified"], 6)
        self.assertTrue(result["profile_rls_verified"])
        self.assertTrue(result["container_removed"])
        self.assertFalse(result["production_modified"])
        self.assertFalse(result["real_user_passwords_used"])

if __name__ == "__main__":
    unittest.main()
