"use client";

import { motion } from "framer-motion";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransaction,
  type TransactionActionState,
} from "@/app/actions/transactions";

const initialState: TransactionActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      type="submit"
      disabled={pending}
      className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#eceeef] px-5 text-sm font-bold text-[#17191b] shadow-[0_10px_32px_rgba(0,0,0,0.18)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17191b]/30 border-t-[#17191b]" />
          Salvando...
        </>
      ) : (
        <>
          <CheckRoundedIcon sx={{ fontSize: 18 }} /> Salvar transação
        </>
      )}
    </motion.button>
  );
}

export function TransactionForm() {
  const [state, action] = useActionState(createTransaction, initialState);

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold text-[#8d9095]">Tipo da movimentação</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="group cursor-pointer">
            <input className="peer sr-only" type="radio" name="tipo" value="receita" defaultChecked />
            <span className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] text-sm font-semibold text-[#81848a] transition group-hover:bg-white/[0.04] peer-checked:border-[#78d8a3]/25 peer-checked:bg-[#78d8a3]/[0.08] peer-checked:text-[#80dfac]">
              <ArrowDownwardRoundedIcon sx={{ fontSize: 19 }} /> Receita
            </span>
          </label>
          <label className="group cursor-pointer">
            <input className="peer sr-only" type="radio" name="tipo" value="despesa" />
            <span className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] text-sm font-semibold text-[#81848a] transition group-hover:bg-white/[0.04] peer-checked:border-[#ff8494]/25 peer-checked:bg-[#ff8494]/[0.08] peer-checked:text-[#ff8d9b]">
              <ArrowUpwardRoundedIcon sx={{ fontSize: 19 }} /> Despesa
            </span>
          </label>
        </div>
        {state.errors?.tipo && <p className="mt-2 text-xs text-[#ff8d9b]">{state.errors.tipo}</p>}
      </fieldset>

      <div>
        <label htmlFor="descricao" className="mb-2 block text-xs font-semibold text-[#8d9095]">Descrição</label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          maxLength={80}
          required
          placeholder="Ex.: Supermercado"
          className="h-12 w-full rounded-2xl border border-white/[0.07] bg-[#111315] px-4 text-sm text-white outline-none transition placeholder:text-[#505257] focus:border-white/20 focus:ring-4 focus:ring-white/[0.035]"
        />
        {state.errors?.descricao && <p className="mt-2 text-xs text-[#ff8d9b]">{state.errors.descricao}</p>}
      </div>

      <div>
        <label htmlFor="valor" className="mb-2 block text-xs font-semibold text-[#8d9095]">Valor</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[#6c6f74]">
            <PaymentsRoundedIcon sx={{ fontSize: 17 }} />
            <span className="text-xs font-semibold">R$</span>
          </span>
          <input
            id="valor"
            name="valor"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            placeholder="0,00"
            className="h-12 w-full rounded-2xl border border-white/[0.07] bg-[#111315] pl-[72px] pr-4 text-sm text-white outline-none transition placeholder:text-[#505257] focus:border-white/20 focus:ring-4 focus:ring-white/[0.035]"
          />
        </div>
        {state.errors?.valor && <p className="mt-2 text-xs text-[#ff8d9b]">{state.errors.valor}</p>}
      </div>

      {state.message && (
        <div className="rounded-2xl border border-[#ff8494]/15 bg-[#ff8494]/[0.06] px-4 py-3 text-xs font-medium text-[#ff99a5]">
          {state.message}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
