"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
import { RelativeDateTime } from "./relative-date-time";
import { LiteraryAvatar } from "./literary-avatar";
import { PriorityBadge } from "./priority-badge";
import { hasPriority } from "@/lib/request-priority";
import { formatWorkTitle } from "@/lib/work-title";
import { showPanelChange } from "@/components/panel-change-toast";

type StaffMember = { id: string; full_name: string; avatar_choice: number | null };
type Mention = { id: string; handle: string };
type ProtocolOption = { id: string; protocol: string; title: string; studentName: string; isPriority: boolean };
type Draft = { partnerId: string | null; body: string; protocol: string; mentions: Mention[] };
const emptyDraft: Draft = { partnerId: null, body: "", protocol: "", mentions: [] };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function staffHandle(name: string) { const parts = name.trim().split(/\s+/); return normalize(`${parts[0]}${parts.length > 1 ? parts.at(-1) : ""}`); }
function savedDraft(userId: string): Draft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`pronto:staff-message-draft:${userId}`) || "null") as Partial<Draft> | null;
    if (saved && typeof saved.body === "string" && typeof saved.protocol === "string" && (typeof saved.partnerId === "string" || saved.partnerId === null) && Array.isArray(saved.mentions))
      return { partnerId: saved.partnerId, body: saved.body, protocol: saved.body.includes(`#${saved.protocol}`) ? saved.protocol : "", mentions: saved.mentions.filter((item): item is Mention => typeof item?.id === "string" && typeof item?.handle === "string") };
  } catch { /* Armazenamento indisponível: mantém o formulário utilizável. */ }
  return emptyDraft;
}
type Message = {
  id: string; sender_id: string; recipient_id: string; request_id: string | null;
  body: string; read_at: string | null; created_at: string;
  request: { protocol: string; priority: { request_id: string } | { request_id: string }[] | null } | null;
};
type Group = { id: string; created_at: string };
type GroupMember = { group_id: string; user_id: string };
type GroupMessage = { id: string; group_id: string; sender_id: string; request_id: string | null; body: string; created_at: string; request: { protocol: string; priority: { request_id: string } | { request_id: string }[] | null } | null };

function StaffAvatar({ staff, id, label, small = false }: { staff: StaffMember[]; id: string; label: string; small?: boolean }) {
  return <LiteraryAvatar id={id} label={label} choice={staff.find((person) => person.id === id)?.avatar_choice ?? null} small={small} />;
}

function MentionMenu({ tokenKind, protocolOptions, options, activeOption, menuPosition, selectProtocol, selectMention }: {
  tokenKind: "staff" | "protocol" | null;
  protocolOptions: ProtocolOption[];
  options: { id: string; full_name: string; handle: string; avatar_choice: number | null }[];
  activeOption: number;
  menuPosition: { top: number; left: number; maxHeight: number; direction: "up" | "down" };
  selectProtocol: (option: ProtocolOption) => void;
  selectMention: (option: { id: string; full_name: string; handle: string; avatar_choice: number | null }) => void;
}) {
  return <div className={`staff-messages__mention-menu${menuPosition.direction === "down" ? " is-below" : ""}`} data-staff-mention-menu role="listbox" aria-label={tokenKind === "protocol" ? "Selecionar protocolo" : "Selecionar destinatário"} style={{ top: menuPosition.top, left: menuPosition.left, maxHeight: menuPosition.maxHeight }}>
    {tokenKind === "protocol" ? protocolOptions.map((option, index) => <div className="staff-messages__protocol-option" key={option.id}><button type="button" role="option" aria-selected={index === activeOption} className={index === activeOption ? "is-active" : ""} onPointerDown={(event) => event.preventDefault()} onClick={() => selectProtocol(option)}><strong>#{option.protocol} {option.isPriority && <PriorityBadge />}</strong><span>{option.title}</span><span className="staff-messages__protocol-student">Solicitante: {option.studentName}</span></button><Link href={`/painel/atendimento/${option.id}`} className="staff-messages__protocol-open" aria-label={`Abrir atendimento ${option.protocol}`}>Abrir <AppIcon name="arrowRight" /></Link></div>) : options.map((option, index) => <button key={option.id} type="button" role="option" aria-selected={index === activeOption} className={`staff-messages__mention-option${index === activeOption ? " is-active" : ""}`} onPointerDown={(event) => event.preventDefault()} onClick={() => selectMention(option)}><span className="staff-messages__mention-avatar">{option.id === "todos" ? <AppIcon name="person" /> : <LiteraryAvatar id={option.id} label={option.full_name} choice={option.avatar_choice} small />}</span><span className="staff-messages__mention-copy"><strong>@{option.handle}</strong><span>{option.full_name}</span></span></button>)}
  </div>;
}

export function StaffMessages({ userId, onRead, onNavigate }: { userId: string; onRead: () => void; onNavigate: () => void }) {
  const [supabase] = useState(createClient);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [visible, setVisible] = useState(100);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const { partnerId, body, protocol, mentions } = draft;
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [tokenKind, setTokenKind] = useState<"staff" | "protocol" | null>(null);
  const [protocolOptions, setProtocolOptions] = useState<ProtocolOption[]>([]);
  const [mentionStart, setMentionStart] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, maxHeight: 200, direction: "up" as "up" | "down" });
  const [activeOption, setActiveOption] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingLastSentAt = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);
  useEffect(() => { setDraft(savedDraft(userId)); setDraftLoaded(true); }, [userId]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { sessionStorage.setItem(`pronto:staff-message-draft:${userId}`, JSON.stringify(draft)); } catch { /* Armazenamento indisponível. */ }
  }, [userId, draft, draftLoaded]);

  const handles = useMemo(() => {
    const used = new Set<string>();
    return staff.map((person) => {
      const base = staffHandle(person.full_name) || "equipe";
      let handle = base;
      for (let suffix = 2; used.has(handle); suffix++) handle = `${base}${suffix}`;
      used.add(handle);
      return { ...person, handle };
    });
  }, [staff]);
  const options = useMemo(() => {
    if (mentionQuery === null) return [];
    const alreadyMentioned = new Set(mentions.filter((item) => new RegExp(`(^|\\s)@${item.handle}(?=\\s|$)`, "i").test(body)).map((item) => item.id));
    return [
      ...("todos".includes(normalize(mentionQuery)) && !(partnerId === "compose" && alreadyMentioned.has("todos")) ? [{ id: "todos", full_name: "Toda a equipe", handle: "todos", avatar_choice: null }] : []),
      ...handles.filter((person) => person.id !== userId && !(partnerId === "compose" && alreadyMentioned.has(person.id)) && normalize(`${person.full_name} ${person.handle}`).includes(normalize(mentionQuery))).slice(0, 7),
    ];
  }, [handles, mentionQuery, userId, mentions, body, partnerId]);

  useEffect(() => {
    if (tokenKind !== "protocol" || mentionQuery === null) return;
    const query = mentionQuery.toUpperCase();
    if (!/^[A-Z0-9-]*$/.test(query)) { setProtocolOptions([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      let request = supabase.from("cataloging_requests").select("id,protocol,title,subtitle,priority:request_priorities(request_id),student:student_profiles!cataloging_requests_student_profile_id_fkey(profile:profiles!student_profiles_profile_id_fkey(full_name))").order("created_at", { ascending: false }).limit(8);
      if (query) request = request.ilike("protocol", `${query}%`);
      const { data, error: lookupError } = await request;
      if (active) setProtocolOptions(lookupError ? [] : (data ?? []).map((item) => {
        const student = Array.isArray(item.student) ? item.student[0] : item.student;
        const profile = Array.isArray(student?.profile) ? student.profile[0] : student?.profile;
        return { id: item.id, protocol: item.protocol, title: formatWorkTitle(item.title, item.subtitle), studentName: profile?.full_name ?? "Nome indisponível", isPriority: hasPriority(item.priority) };
      }));
    }, 120);
    return () => { active = false; window.clearTimeout(timer); };
  }, [supabase, tokenKind, mentionQuery]);

  const positionMenu = useCallback((textarea: HTMLTextAreaElement, beforeCaret: string, itemCount: number, isProtocol = false) => {
    const style = getComputedStyle(textarea);
    const mirror = document.createElement("div");
    Object.assign(mirror.style, { position: "fixed", visibility: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word", width: `${textarea.clientWidth}px`, font: style.font, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, padding: style.padding, border: style.border, boxSizing: "border-box" });
    mirror.textContent = beforeCaret;
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.append(marker);
    document.body.append(mirror);
    const caret = marker.getBoundingClientRect();
    const origin = mirror.getBoundingClientRect();
    const rect = textarea.getBoundingClientRect();
    const caretTop = rect.top + caret.top - origin.top - textarea.scrollTop;
    const lineHeight = Number.parseFloat(style.lineHeight) || 18;
    const above = Math.max(0, caretTop - 14);
    const below = Math.max(0, window.innerHeight - caretTop - lineHeight - 14);
    const desiredHeight = Math.min(200, itemCount * (isProtocol ? 64 : 44) + 10);
    const direction = below >= desiredHeight || below >= above ? "down" : "up";
    setMenuPosition({ top: direction === "down" ? caretTop + lineHeight + 5 : caretTop - 5, left: Math.max(8, Math.min(window.innerWidth - 292, rect.left + caret.left - origin.left - textarea.scrollLeft)), maxHeight: Math.max(44, Math.min(200, direction === "down" ? below : above)), direction });
    mirror.remove();
  }, []);

  function updateMention(textarea: HTMLTextAreaElement) {
    const before = textarea.value.slice(0, textarea.selectionStart);
    const match = /(?:^|\s)([@#])([\p{L}\p{N}-]*)$/u.exec(before);
    if (!match) { setMentionQuery(null); setTokenKind(null); return; }
    setMentionStart(before.length - match[0].length + (match[0].startsWith(match[1]) ? 0 : 1));
    setTokenKind(match[1] === "@" ? "staff" : "protocol");
    setMentionQuery(match[2]);
    setActiveOption(0);
    positionMenu(textarea, before, match[1] === "@" ? options.length : protocolOptions.length, match[1] === "#");
  }

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || mentionQuery === null) return;
    const reposition = () => positionMenu(textarea, textarea.value.slice(0, textarea.selectionStart), tokenKind === "protocol" ? protocolOptions.length : options.length, tokenKind === "protocol");
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => { window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [mentionQuery, tokenKind, options.length, protocolOptions.length, positionMenu]);

  function selectMention(option: { id: string; handle: string }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (partnerId === "compose" && mentions.some((item) => item.id === option.id && new RegExp(`(^|\\s)@${item.handle}(?=\\s|$)`, "i").test(body))) {
      setMentionQuery(null);
      return;
    }
    const end = textarea.selectionStart;
    const nextBody = `${body.slice(0, mentionStart)}@${option.handle} ${body.slice(end)}`;
    setDraft((current) => ({ ...current, body: nextBody, mentions: option.id === "todos" ? [...current.mentions.filter((item) => item.id !== "todos"), { id: "todos", handle: "todos" }] : [...current.mentions.filter((item) => item.id !== option.id), { id: option.id, handle: option.handle }] }));
    setMentionQuery(null);
    setTokenKind(null);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(mentionStart + option.handle.length + 2, mentionStart + option.handle.length + 2); });
  }

  function selectProtocol(option: ProtocolOption) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const end = textarea.selectionStart;
    setDraft((current) => ({ ...current, body: `${current.body.slice(0, mentionStart)}#${option.protocol} ${current.body.slice(end)}`, protocol: option.protocol }));
    setMentionQuery(null);
    setTokenKind(null);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(mentionStart + option.protocol.length + 2, mentionStart + option.protocol.length + 2); });
  }

  const refresh = useCallback(async () => {
    const [people, history, groupsResult, membersResult, groupHistory] = await Promise.all([
      supabase.from("profiles").select("id,full_name,avatar_choice").in("role", ["cataloger", "administrator"]).eq("status", "active").order("full_name"),
      supabase.from("staff_messages").select("id,sender_id,recipient_id,request_id,body,read_at,created_at,request:cataloging_requests!staff_messages_request_id_fkey(protocol,priority:request_priorities(request_id))").order("created_at", { ascending: false }).limit(visible),
      supabase.from("staff_message_groups").select("id,created_at").order("created_at", { ascending: false }),
      supabase.from("staff_message_group_members").select("group_id,user_id"),
      supabase.from("staff_group_messages").select("id,group_id,sender_id,request_id,body,created_at,request:cataloging_requests!staff_group_messages_request_id_fkey(protocol,priority:request_priorities(request_id))").order("created_at", { ascending: false }).limit(visible),
    ]);
    if (people.error || history.error || groupsResult.error || membersResult.error || groupHistory.error) { setError("Não foi possível carregar as mensagens."); return; }
    setStaff(people.data ?? []);
    setMessages((history.data ?? []) as unknown as Message[]);
    setGroups(groupsResult.data ?? []);
    setGroupMembers(membersResult.data ?? []);
    setGroupMessages((groupHistory.data ?? []) as unknown as GroupMessage[]);
    setError("");
    const { error: readError } = await supabase.rpc("mark_staff_messages_read");
    if (readError) setError("Não foi possível atualizar a leitura das mensagens.");
    else onRead();
  }, [supabase, onRead, visible]);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel(`staff-messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_messages", filter: `recipient_id=eq.${userId}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_messages", filter: `sender_id=eq.${userId}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_group_messages" }, () => { void refresh(); })
      .subscribe();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [supabase, userId, refresh]);

  const conversations = useMemo(() => {
    const latest = new Map<string, Message>();
    for (const message of messages) {
      const otherId = message.sender_id === userId ? message.recipient_id : message.sender_id;
      if (!latest.has(otherId)) latest.set(otherId, message);
    }
    return staff.filter((person) => person.id !== userId).map((person) => ({ id: person.id, message: latest.get(person.id) ?? null, name: person.full_name }));
  }, [messages, staff, userId]);
  const groupConversations = useMemo(() => groups.map((group) => {
    const participants = groupMembers.filter((member) => member.group_id === group.id);
    const names = participants.filter((member) => member.user_id !== userId).map((member) => staff.find((person) => person.id === member.user_id)?.full_name ?? "Integrante da equipe");
    return { id: `group:${group.id}`, name: names.join(", "), members: participants, message: groupMessages.find((message) => message.group_id === group.id) ?? null };
  }), [groups, groupMembers, groupMessages, staff, userId]);
  const selectedGroup = groupConversations.find((group) => group.id === partnerId);
  const conversation = messages.filter((message) => partnerId && partnerId !== "compose" && (message.sender_id === partnerId || message.recipient_id === partnerId)).reverse();
  const groupThread = groupMessages.filter((message) => message.group_id === partnerId?.slice(6)).reverse();
  const partnerName = staff.find((person) => person.id === partnerId)?.full_name ?? "Integrante da equipe";

  const refreshTyping = useCallback(async () => {
    if (!partnerId || partnerId === "compose") { setTypingUserIds([]); return; }
    const now = new Date().toISOString();
    const query = supabase.from("staff_typing_indicators").select("sender_id").gt("expires_at", now);
    const { data, error: typingError } = partnerId.startsWith("group:")
      ? await query.eq("group_id", partnerId.slice(6)).neq("sender_id", userId)
      : await query.eq("recipient_id", userId).eq("sender_id", partnerId);
    if (!typingError) setTypingUserIds((data ?? []).map((item) => item.sender_id));
  }, [partnerId, supabase, userId]);

  useEffect(() => {
    void refreshTyping();
    const channel = supabase.channel(`staff-typing-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_typing_indicators" }, () => { void refreshTyping(); })
      .subscribe();
    const timer = window.setInterval(() => { void refreshTyping(); }, 2000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [refreshTyping, supabase, userId]);

  function announceTyping(isTyping: boolean) {
    if (!partnerId || partnerId === "compose") return;
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTyping) typingStopTimer.current = setTimeout(() => announceTyping(false), 5000);
    const now = Date.now();
    if (isTyping && now - typingLastSentAt.current < 1800) return;
    typingLastSentAt.current = isTyping ? now : 0;
    const target = partnerId.startsWith("group:")
      ? { target_recipient_id: null, target_group_id: partnerId.slice(6) }
      : { target_recipient_id: partnerId, target_group_id: null };
    void supabase.rpc("set_staff_typing", { ...target, is_typing: isTyping });
  }

  const lastDirectMessageId = conversation.at(-1)?.id;
  const lastGroupMessageId = groupThread.at(-1)?.id;
  useEffect(() => {
    if (partnerId && partnerId !== "compose") threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [partnerId, lastDirectMessageId, lastGroupMessageId]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    const selected = mentions.filter((item) => new RegExp(`(^|\\s)@${item.handle}(?=\\s|$)`, "i").test(body));
    const unresolved = [...body.matchAll(/(?:^|\s)@([\p{L}\p{N}]+)/gu)].map((match) => match[1]).filter((handle) => !selected.some((item) => item.handle.toLowerCase() === handle.toLowerCase()));
    if (unresolved.length) { setError(`Selecione ${unresolved.map((handle) => `@${handle}`).join(", ")} na lista antes de enviar.`); return; }
    const protocolTokens = [...body.matchAll(/(?:^|\s)#([A-Za-z0-9-]+)/g)].map((match) => match[1].toUpperCase());
    if (protocolTokens.some((token) => !protocol || token !== protocol) || new Set(protocolTokens).size > 1) { setError("Selecione um protocolo na lista de # antes de enviar. Use apenas um por mensagem."); return; }
    const selectedProtocol = protocolTokens.includes(protocol) ? protocol : null;
    const includeAll = selected.some((item) => item.id === "todos");
    if (partnerId?.startsWith("group:") && selected.some((item) => item.id !== "todos" && !groupMembers.some((member) => member.group_id === partnerId.slice(6) && member.user_id === item.id))) {
      setError("Para conversar com outras pessoas, inicie uma nova conversa em grupo.");
      return;
    }
    const recipientIds = [...new Set([...(partnerId && partnerId !== "compose" && !partnerId.startsWith("group:") ? [partnerId] : []), ...selected.filter((item) => item.id !== "todos").map((item) => item.id)])];
    if (!partnerId?.startsWith("group:") && !includeAll && recipientIds.length === 0) { setError("Escolha uma pessoa com @ ou selecione @todos."); return; }
    if (partnerId === "compose" && !includeAll && recipientIds.length < 2) { setError("Selecione pelo menos duas pessoas para iniciar um grupo. Para conversar com uma pessoa, escolha-a na lista."); return; }
    setBusy(true);
    setError("");
    const common = { message_body: body.trim(), target_protocol: selectedProtocol };
    let sendError: { message: string } | null = null;
    let nextPartnerId = partnerId;
    if (partnerId?.startsWith("group:")) {
      const result = await supabase.rpc("send_staff_group_message", { target_group_id: partnerId.slice(6), ...common });
      sendError = result.error;
    } else if (includeAll || recipientIds.length > 1) {
      const result = await supabase.rpc("create_staff_message_group", { target_recipient_ids: recipientIds, include_all: includeAll, ...common });
      sendError = result.error;
      if (result.data) nextPartnerId = `group:${result.data}`;
    } else {
      const result = await supabase.rpc("send_staff_message", { target_recipient_id: recipientIds[0], ...common });
      sendError = result.error;
      nextPartnerId = recipientIds[0];
    }
    setBusy(false);
    if (sendError) {
      setError(sendError.message.includes("protocol_not_found") ? "Protocolo não encontrado." : sendError.message.includes("group_requires_two_recipients") ? "Para criar um grupo, selecione pelo menos duas pessoas." : sendError.message.includes("active_staff_recipient_required") ? "Esse destinatário não está disponível." : "Não foi possível enviar a mensagem.");
      return;
    }
    setDraft({ partnerId: nextPartnerId, body: "", protocol: "", mentions: [] });
    showPanelChange("Mensagem enviada");
    announceTyping(false);
    await refresh();
  }

  return <div className="staff-messages">
    <div className={`staff-messages__header${!partnerId ? " staff-messages__header--list" : ""}`}>
      {partnerId ? <><button className="staff-messages__back" type="button" aria-label="Voltar às conversas" title="Voltar às conversas" onClick={() => setDraft((current) => ({ ...current, partnerId: null }))}>←</button><div className="staff-messages__header-person">{partnerId === "compose" ? <><span className="staff-messages__group-icon"><AppIcon name="person" /></span><strong>Novo grupo</strong></> : selectedGroup ? <><span className="staff-messages__group-avatars">{selectedGroup.members.filter((member) => member.user_id !== userId).slice(0, 2).map((member) => <StaffAvatar staff={staff} key={member.user_id} id={member.user_id} label={staff.find((person) => person.id === member.user_id)?.full_name ?? "Integrante da equipe"} small />)}</span><strong>{selectedGroup.name || "Grupo da equipe"}</strong></> : <><StaffAvatar staff={staff} id={partnerId} label={partnerName} small /><strong>{partnerName}</strong></>}</div></> : <button className="staff-messages__new-chat" type="button" onClick={() => setDraft((current) => ({ ...current, partnerId: "compose" }))}><AppIcon name="edit" /> Nova conversa</button>}
    </div>
    {error && <p className="staff-notifications__error" role="alert">{error}</p>}
    {!partnerId ? <>
      <div className="staff-messages__list">
        {groupConversations.map((group) => <button className="staff-messages__conversation" key={group.id} type="button" onClick={() => setDraft((current) => ({ ...current, partnerId: group.id }))}><span className="staff-messages__group-avatars">{group.members.filter((member) => member.user_id !== userId).slice(0, 2).map((member) => <StaffAvatar staff={staff} key={member.user_id} id={member.user_id} label={staff.find((person) => person.id === member.user_id)?.full_name ?? "Integrante da equipe"} small />)}</span><span className="staff-messages__conversation-copy"><strong>{group.name || "Grupo da equipe"}</strong><span>{group.message ? `${group.message.sender_id === userId ? "Você: " : ""}${group.message.body}` : "Conversa em grupo"}</span>{group.message && <RelativeDateTime value={group.message.created_at} focusable={false} />}</span></button>)}
        {conversations.map(({ id, name, message }) => <button className="staff-messages__conversation" key={id} type="button" onClick={() => setDraft((current) => ({ ...current, partnerId: id }))}><StaffAvatar staff={staff} id={id} label={name} /><span className="staff-messages__conversation-copy"><strong>{name}</strong><span>{message ? `${message.sender_id === userId ? "Você: " : ""}${message.body}` : "Comece uma conversa"}</span>{message && <RelativeDateTime value={message.created_at} focusable={false} />}</span></button>)}
        {!conversations.length && !groupConversations.length && <p>Nenhuma outra pessoa da equipe está ativa no momento.</p>}
      </div>
      {messages.length === visible && <button className="staff-notifications__more" type="button" onClick={() => setVisible((count) => count + 100)}>Carregar mensagens anteriores</button>}
    </> : <>
      {partnerId === "compose" ? <div className="staff-messages__empty-thread"><span className="staff-messages__group-icon"><AppIcon name="person" /></span><strong>Comece uma conversa em grupo</strong><p>Digite @ e escolha pelo menos duas pessoas. Use @todos para chamar toda a equipe.</p></div> : <div className={`staff-messages__thread${selectedGroup ? " staff-messages__thread--group" : " staff-messages__thread--direct"}`} ref={threadRef}>{selectedGroup ? groupThread.length ? groupThread.map((message) => <article key={message.id} className={message.sender_id === userId ? "is-sent" : "is-received"}><div className="staff-messages__sender"><StaffAvatar staff={staff} id={message.sender_id} label={staff.find((person) => person.id === message.sender_id)?.full_name ?? "Você"} small /><strong>{message.sender_id === userId ? "Você" : staff.find((person) => person.id === message.sender_id)?.full_name ?? "Integrante da equipe"}</strong></div><p>{message.body}</p>{message.request_id && <Link href={`/painel/atendimento/${message.request_id}`} onClick={onNavigate}>Protocolo {message.request?.protocol ?? "vinculado"} {hasPriority(message.request?.priority) && <PriorityBadge />} <AppIcon name="arrowRight" /></Link>}<RelativeDateTime value={message.created_at} /></article>) : <p className="staff-messages__empty">Ainda não há mensagens neste grupo. Escreva a primeira abaixo.</p> : conversation.length ? conversation.map((message) => <article key={message.id} className={message.sender_id === userId ? "is-sent" : "is-received"}><div className="staff-messages__sender"><StaffAvatar staff={staff} id={message.sender_id} label={message.sender_id === userId ? "Você" : partnerName} small /><strong>{message.sender_id === userId ? "Você" : partnerName}</strong></div><p>{message.body}</p>{message.request_id && <Link href={`/painel/atendimento/${message.request_id}`} onClick={onNavigate}>Protocolo {message.request?.protocol ?? "vinculado"} {hasPriority(message.request?.priority) && <PriorityBadge />} <AppIcon name="arrowRight" /></Link>}<RelativeDateTime value={message.created_at} /></article>) : <p className="staff-messages__empty">Ainda não há mensagens nesta conversa. Escreva a primeira abaixo.</p>}</div>}
      {messages.length === visible && <button className="staff-notifications__more" type="button" onClick={() => setVisible((count) => count + 100)}>Carregar mensagens anteriores</button>}
      {typingUserIds.length > 0 && <p className="staff-messages__typing" role="status"><span className="staff-messages__typing-dots" aria-hidden="true"><i /><i /><i /></span>{typingUserIds.map((id) => staff.find((person) => person.id === id)?.full_name?.split(" ")[0] ?? "Alguém").join(", ")} {typingUserIds.length === 1 ? "está digitando" : "estão digitando"}…</p>}
      <form className="staff-messages__compose" onSubmit={(event) => void send(event)}><div className="staff-messages__compose-row"><textarea aria-label="Mensagem" ref={textareaRef} value={body} onChange={(event) => { setDraft((current) => ({ ...current, body: event.target.value })); updateMention(event.target); announceTyping(Boolean(event.target.value.trim())); }} onBlur={() => announceTyping(false)} onClick={(event) => updateMention(event.currentTarget)} onKeyDown={(event) => {
        const count = tokenKind === "protocol" ? protocolOptions.length : options.length;
        if (mentionQuery === null || !count) { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setActiveOption((current) => (current + (event.key === "ArrowDown" ? 1 : count - 1)) % count); }
        if (event.key === "Enter") { event.preventDefault(); if (tokenKind === "protocol") selectProtocol(protocolOptions[activeOption] ?? protocolOptions[0]); else selectMention(options[activeOption] ?? options[0]); }
        if (event.key === "Escape") { event.stopPropagation(); setMentionQuery(null); setTokenKind(null); }
      }} maxLength={2000} rows={2} placeholder="Escreva uma mensagem…" required /><button type="submit" aria-label={busy ? "Enviando mensagem" : "Enviar mensagem"} title="Enviar mensagem" disabled={busy || !body.trim()}><AppIcon name="arrowRight" /></button></div><small className="staff-messages__compose-help">@ pessoas · # protocolo · Enter envia · Shift+Enter quebra linha</small></form>
      {portalTarget && mentionQuery !== null && (tokenKind === "protocol" ? protocolOptions.length : options.length) > 0 && createPortal(<MentionMenu tokenKind={tokenKind} protocolOptions={protocolOptions} options={options} activeOption={activeOption} menuPosition={menuPosition} selectProtocol={selectProtocol} selectMention={selectMention} />, portalTarget)}
    </>}
  </div>;
}
