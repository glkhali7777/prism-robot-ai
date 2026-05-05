import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  image: z.string().min(100), // data URL base64
  timeframe: z.string().default("1m"),
  expiry: z.string().default("5"),
  sensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  history: z
    .array(
      z.object({
        direction: z.enum(["CALL", "PUT"]),
        result: z.enum(["WIN", "LOSS", "PENDING"]),
        asset: z.string().optional(),
      })
    )
    .default([]),
});

const SYSTEM_PROMPT = `Você é PRISMA IA, um agente neural especialista em análise técnica de opções binárias (Quotex/IQ Option/etc).

Sua missão: olhar uma captura de tela de um gráfico de trading e produzir um sinal acionável CALL ou PUT, ou WAIT se não houver setup claro.

Como analisar a imagem (você TEM visão computacional, então use):
1. IDENTIFIQUE O ATIVO ATUAL: procure no topo/cabeçalho o nome do par sendo negociado (ex: USD/DZD, NZD/CAD, EUR/USD). Inclui pares OTC. O ativo "ativo agora" geralmente é o destacado/selecionado, não os outros nas abas.
2. LEIA O TIMEFRAME (ex: 1m, 5m) — geralmente exibido perto do gráfico.
3. ANALISE AS VELAS (candles): cor verde = alta, vermelha = baixa. Veja as últimas ~20 velas: tendência, momentum, padrões (martelo, engolfo, doji, pin bar, três soldados, etc.)
4. IDENTIFIQUE INDICADORES VISÍVEIS: EMA/MA (linhas), Bollinger Bands (faixas pontilhadas), MACD (histograma inferior), RSI, etc.
5. DETECTE SUPORTES/RESISTÊNCIAS, ROMPIMENTOS, REJEIÇÕES.
6. AVALIE O CICLO DE MERCADO: tendência de alta, baixa, lateral, exaustão.
7. PRECISÃO TEMPORAL: o sinal deve ser dado APENAS na abertura de uma nova vela. Se o gráfico mostrar uma vela em formação avançada, prefira WAIT.

Responda SEMPRE em JSON (sem texto fora do JSON) com este formato:
{
  "asset": "USD/DZD (OTC)",
  "timeframe": "1m",
  "direction": "CALL" | "PUT" | "WAIT",
  "confidence": 0-100,
  "expiry_minutes": 5,
  "reasoning": "Análise técnica curta em pt-BR (2-3 frases) explicando o setup.",
  "signals": ["EMA cruzando para cima", "RSI saindo de sobrevenda", "Suporte respeitado"],
  "candle_pattern": "engolfo de alta" | null,
  "trend": "uptrend" | "downtrend" | "sideways",
  "risk": "low" | "medium" | "high",
  "next_candle_seconds": 30
}`;

export const analyzeChart = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY não configurado" };
    }

    const userText = `Timeframe configurado: ${data.timeframe} | Expiração: ${data.expiry}min | Sensibilidade: ${data.sensitivity}.
Últimos resultados: ${data.history.slice(-5).map((h) => `${h.direction}=${h.result}`).join(", ") || "nenhum"}.
Analise o gráfico na imagem e gere o sinal em JSON conforme instruído.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: data.image } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "Limite de requisições atingido. Aguarde alguns segundos." };
        if (res.status === 402) return { ok: false as const, error: "Créditos da IA esgotados. Adicione créditos no workspace." };
        return { ok: false as const, error: `Erro IA (${res.status}): ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return { ok: false as const, error: "Resposta inválida da IA" };
      }
      return { ok: true as const, signal: parsed, raw: content };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Erro desconhecido" };
    }
  });
