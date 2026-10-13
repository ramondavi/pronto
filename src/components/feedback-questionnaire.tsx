"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { feedbackAgeBands, feedbackComparisons, feedbackDifficulties, feedbackDigitalAutonomy, feedbackDigitalFamiliarity, feedbackRatings, feedbackResidences } from "@/lib/feedback-questions";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type Answers = Record<string, string>;

export function FeedbackQuestionnaire({ requestId, protocol, postgraduate }: { requestId: string; protocol: string; postgraduate: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string, values?: Record<string, string | number>) => uiText(language, source, values);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setAnswers((current) => ({ ...current, [key]: value }));
  const ratingGroups = [feedbackRatings.slice(0, 4), feedbackRatings.slice(4, 8), feedbackRatings.slice(8)];
  const currentRatings = ratingGroups[step];
  const canAdvance = currentRatings.every((item) => Boolean(answers[item.key])) && (step !== 2 || Boolean(answers.difficulty) && Boolean(answers.age_band) && Boolean(answers.residence) && Boolean(answers.digital_familiarity) && Boolean(answers.digital_autonomy) && (!postgraduate || Boolean(answers.prior_email)) && (!postgraduate || answers.prior_email !== "yes" || Boolean(answers.comparison)));

  async function submit() {
    if (!canAdvance || saving) return;
    setSaving(true);
    setError("");
    const responseAnswers: Answers = { ...answers };
    if (!postgraduate || answers.prior_email !== "yes") {
      delete responseAnswers.comparison;
      delete responseAnswers.comparison_note;
    }
    const { error: saveError } = await createClient().rpc("submit_request_feedback", { target_request_id: requestId, response_answers: responseAnswers });
    setSaving(false);
    if (saveError) { setError(t("Não foi possível enviar sua avaliação. Suas respostas continuam nesta tela para você tentar novamente.")); return; }
    setDone(true);
  }

  if (done) return <section className="feedback-thanks panel" role="status"><span aria-hidden="true">✓</span><p className="eyebrow">{t("Avaliação enviada")}</p><h2>{t("Obrigado por ajudar a melhorar o Pronto!")}</h2><p>{t("Suas respostas vão orientar melhorias no sistema e nos serviços da BIB/FA.")}</p></section>;

  return <section className="feedback-form panel" aria-labelledby="feedback-title">
    <header className="feedback-form__header"><div><p className="eyebrow">{t("Sua experiência importa")}</p><h2 id="feedback-title">{t("Conte como foi usar o Pronto!")}</h2><p>{t("Protocolo {protocol} · Cerca de 3 minutos · Sua avaliação não altera o resultado do atendimento.", { protocol })}</p><p>{t("As respostas são anônimas e não ficam vinculadas ao seu nome ou protocolo.")}</p></div><span className="feedback-form__badge">{t("{step} de 3", { step: step + 1 })}</span></header>
    <div className="feedback-form__progress" aria-label={t("Etapa {step} de 3", { step: step + 1 })}><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div>
    <div className="feedback-form__questions">
      {currentRatings.map((item, index) => <fieldset className="feedback-form__rating" key={item.key}><legend><span>{step * 4 + index + 1}</span>{t(item.question)}</legend><div className="feedback-form__scale" role="group" aria-label={t(item.question)}>{[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" aria-pressed={answers[item.key] === String(score)} className={answers[item.key] === String(score) ? "is-selected" : ""} onClick={() => set(item.key, String(score))}>{score}</button>)}{item.key !== "overall" && <button type="button" className={`feedback-form__na${answers[item.key] === "na" ? " is-selected" : ""}`} aria-pressed={answers[item.key] === "na"} onClick={() => set(item.key, "na")}>{t("Não se aplica")}</button>}</div><div className="feedback-form__scale-labels"><span>{t(item.low)}</span><span>{t(item.high)}</span></div></fieldset>)}
      {step === 2 && <>
        <fieldset className="feedback-form__choice"><legend><span>10</span>{t("Em qual etapa você encontrou mais dificuldade?")}</legend><div>{feedbackDifficulties.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.difficulty === value} className={answers.difficulty === value ? "is-selected" : ""} onClick={() => set("difficulty", value)}>{t(label)}</button>)}</div></fieldset>
        {postgraduate && <fieldset className="feedback-form__choice"><legend>{t("Você já solicitou uma ficha à BIB/FA por troca de e-mails, antes do Pronto!?")}</legend><div>{[["yes", "Sim"], ["no", "Não"], ["unsure", "Não tenho certeza"]].map(([value, label]) => <button key={value} type="button" aria-pressed={answers.prior_email === value} className={answers.prior_email === value ? "is-selected" : ""} onClick={() => set("prior_email", value)}>{t(label)}</button>)}</div></fieldset>}
        {postgraduate && answers.prior_email === "yes" && <><fieldset className="feedback-form__choice"><legend>{t("Em comparação com a solicitação por e-mail, como foi usar o Pronto!?")}</legend><div>{feedbackComparisons.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.comparison === value} className={answers.comparison === value ? "is-selected" : ""} onClick={() => set("comparison", value)}>{t(label)}</button>)}</div></fieldset><label className="feedback-form__text">{t("O que ficou melhor ou pior?")} <span>{t("Opcional. Não inclua dados pessoais.")}</span><textarea maxLength={1000} value={answers.comparison_note ?? ""} onChange={(event) => set("comparison_note", event.target.value)} rows={3} /></label></>}
        <fieldset className="feedback-form__choice"><legend>{t("Qual é sua faixa etária?")}</legend><div>{feedbackAgeBands.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.age_band === value} className={answers.age_band === value ? "is-selected" : ""} onClick={() => set("age_band", value)}>{t(label)}</button>)}</div></fieldset>
        <fieldset className="feedback-form__choice"><legend>{t("Onde você mora?")}</legend><div>{feedbackResidences.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.residence === value} className={answers.residence === value ? "is-selected" : ""} onClick={() => set("residence", value)}>{t(label)}</button>)}</div></fieldset>
        <fieldset className="feedback-form__choice"><legend>{t("Com que frequência você usa os serviços digitais da UFBA, tais como SIGAA, Pergamum, Repositório Institucional, Portal de Periódicos, GERE etc.?")}</legend><div>{feedbackDigitalFamiliarity.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.digital_familiarity === value} className={answers.digital_familiarity === value ? "is-selected" : ""} onClick={() => set("digital_familiarity", value)}>{t(label)}</button>)}</div></fieldset>
        <fieldset className="feedback-form__choice"><legend>{t("Ao utilizar serviços digitais da UFBA, você costuma precisar de ajuda de outra pessoa?")}</legend><div>{feedbackDigitalAutonomy.map(([value, label]) => <button key={value} type="button" aria-pressed={answers.digital_autonomy === value} className={answers.digital_autonomy === value ? "is-selected" : ""} onClick={() => set("digital_autonomy", value)}>{t(label)}</button>)}</div></fieldset>
        <label className="feedback-form__text">{t("O que deveríamos melhorar primeiro?")} <span>{t("Opcional. Não inclua nomes, números de protocolo ou outros dados pessoais.")}</span><textarea maxLength={1000} value={answers.improvement ?? ""} onChange={(event) => set("improvement", event.target.value)} rows={3} /></label>
      </>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer className="feedback-form__actions">{step > 0 && <button type="button" className="button button--secondary" onClick={() => { setStep(step - 1); setError(""); }}>{t("Voltar")}</button>}<button type="button" className="button button--primary" disabled={!canAdvance || saving} onClick={() => { if (step < 2) { setStep(step + 1); setError(""); } else void submit(); }}>{t(step < 2 ? "Continuar" : saving ? "Enviando…" : "Enviar avaliação")}</button></footer>
  </section>;
}
