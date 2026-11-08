import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppIcon } from "@/components/app-icon";
import { BrandPixels } from "@/components/brand-pixels";
import { StaffGuideSearch } from "@/components/staff-guide-search";
import { StaffGuideNavigation, type GuideNavigationPage } from "@/components/staff-guide-navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OfficialLibraryLogo } from "@/components/official-library-logo";
import { StaffGuideIdentity } from "@/components/staff-guide-identity";
import { userHasPermission } from "@/lib/staff-permissions";
import packageInfo from "../../../package.json";

export const metadata: Metadata = { title: "Guia da equipe", robots: { index: false, follow: false } };

export default async function StaffGuideLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?perfil=equipe&next=%2Fguia-equipe");
  const { data: profile } = await supabase.from("profiles").select("role,status,full_name,avatar_choice").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !["cataloger", "administrator"].includes(profile.role)) redirect("/painel");
  const { data: pages } = await supabase.from("staff_guide_pages")
    .select("published_slug,published_section,published_title,published_position,published_html")
    .not("published_at", "is", null).order("published_position");
  const navigationPages = (pages ?? []).filter((page): page is GuideNavigationPage => Boolean(page.published_slug && page.published_section && page.published_title && page.published_html));
  const [canSeeQueue, canManageGuide] = await Promise.all([
    userHasPermission(supabase, "staff.queue.view", profile.role),
    userHasPermission(supabase, "admin.guide.manage", profile.role),
  ]);
  return <div className="staff-docs">
    <header className="staff-docs__header"><div className="staff-docs__header-inner"><div className="staff-docs__brand"><span className="staff-docs__brand-slot"><span className="staff-docs__brand-icon"><BrandPixels symbol /></span><Link href="/painel" className="staff-docs__back" aria-label="Voltar ao painel" title="Voltar ao painel"><AppIcon name="undo" /></Link></span><Link href="/guia-equipe" className="staff-docs__brand-copy"><strong>Guia da equipe</strong><small>Pronto! · BIB/FAUFBA</small></Link></div><StaffGuideSearch /><div className="staff-docs__header-actions"><ThemeSwitcher /><StaffGuideIdentity userId={user.id} fullName={profile.full_name} role={profile.role} avatarChoice={profile.avatar_choice} /></div></div></header>
    <div className="staff-docs__layout"><aside className="staff-docs__sidebar"><p className="staff-docs__sidebar-label">Documentação interna</p><StaffGuideNavigation pages={navigationPages} /></aside><div className="staff-docs__main-column"><div className="staff-docs__content">{children}</div>
      <footer className="staff-docs__footer"><div className="staff-docs__footer-content"><div className="staff-docs__footer-branding"><OfficialLibraryLogo variant="footer" /><nav aria-label="Acessos ao painel"><Link href="/painel">Visão geral</Link>{canSeeQueue && <Link href="/painel/fila">Fila de solicitações</Link>}{canManageGuide && <Link href="/painel/admin?area=conteudo&aba=guide">Editar guia</Link>}<Link href="/painel/conta">Minha conta</Link></nav><div className="staff-docs__institutions" aria-label="Instituições"><a href="https://ufba.br" target="_blank" rel="noreferrer"><Image src="/brasao-ufba.png" alt="Universidade Federal da Bahia" width={1135} height={1739} /></a><a href="https://sibi.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-sibi.png" alt="Sistema Universitário de Bibliotecas da UFBA" width={2876} height={850} /></a><a href="https://arquitetura.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-faufba.png" alt="Faculdade de Arquitetura da UFBA" width={230} height={205} /></a></div></div><div className="staff-docs__footer-details"><p className="staff-docs__credit">Feito pelos bibliotecários da BIB/FAUFBA com <a href="https://openai.com/codex/" target="_blank" rel="noreferrer"><em>vibe coding</em></a> e <span aria-label="amor" role="img">♥</span>.</p><div className="staff-docs__meta"><span>2026 · v{packageInfo.version} · Beta</span><a href="https://github.com/ramondavi/pronto" target="_blank" rel="noreferrer"><AppIcon name="github" />Código aberto no GitHub ↗</a><span>Licença AGPL-3.0</span></div></div></div></footer>
    </div></div>
  </div>;
}
