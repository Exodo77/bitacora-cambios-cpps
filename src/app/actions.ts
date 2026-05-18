"use server";

import fs from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

const dataFilePath = path.join(process.cwd(), "data", "timeline.json");

export type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  description: string;
  tags: string[];
  type: 'extra' | 'pending';
  price?: number;
};

// Initialize Redis if environment variables are set (Vercel)
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({
    url: redisUrl,
    token: redisToken,
  })
  : null;

// Initialize data file if it doesn't exist (Local only)
async function ensureDataFile() {
  if (redis) return;
  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    try {
      await fs.access(dataFilePath);
    } catch {
      await fs.writeFile(dataFilePath, JSON.stringify([]), "utf-8");
    }
  } catch (error) {
    console.error("Failed to ensure data file:", error);
  }
}

export async function getTimelineData(): Promise<TimelineEntry[]> {
  try {
    if (redis) {
      let data = await redis.get<TimelineEntry[]>("timeline_data");

      // Auto-migrate from local file if Redis is completely empty
      if (!data || data.length === 0) {
        try {
          const fileData = await fs.readFile(dataFilePath, "utf-8");
          const parsed = JSON.parse(fileData);
          if (parsed && parsed.length > 0) {
            await redis.set("timeline_data", parsed);
            data = parsed;
          }
        } catch (e) {
          console.log("No local file found to migrate.");
        }
      }
      return data || [];
    } else {
      await ensureDataFile();
      const data = await fs.readFile(dataFilePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading timeline data:", error);
    return [];
  }
}

export async function saveTimelineData(data: TimelineEntry[], password?: string) {
  const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== correctPassword) {
    return { success: false, error: "Contraseña incorrecta" };
  }

  try {
    if (redis) {
      await redis.set("timeline_data", data);
    } else {
      await ensureDataFile();
      await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
    }
    return { success: true };
  } catch (error) {
    console.error("Error saving timeline data:", error);
    return { success: false, error: "Error interno al guardar" };
  }
}

export async function verifyPassword(password: string) {
  const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === correctPassword;
}

export async function enhanceDescription(text: string): Promise<{ success: boolean; data?: string; error?: string }> {
  const apiKey = process.env.BLACKBOX_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Falta configurar BLACKBOX_API_KEY en .env.local" };
  }

  try {
    const response = await fetch("https://api.blackbox.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "blackboxai/blackbox-pro",
        messages: [
          {
            role: "system",
            content: "Actúa como redactor técnico profesional para bitácoras de desarrollo; recibirás descripciones informales de cambios o implementaciones y debes convertirlas en documentación profesional en formato Markdown, clara y moderadamente detallada, organizando la información mediante secciones y enumeraciones simples cuando corresponda, sin expandir innecesariamente ni inventar información, evitando jerarquías profundas o numeraciones excesivas (como 2.1.1), manteniendo lenguaje técnico formal, agregando breve contexto aclaratorio solo cuando mejore la comprensión, y respondiendo únicamente con el texto final redactado."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Error de la API: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data.choices[0].message.content };
  } catch (error: any) {
    console.error("Error enhancing description:", error);
    return { success: false, error: error.message || "Error al conectar con la IA" };
  }
}

export async function askBlackboxChat(messages: { role: string, content: string }[]): Promise<{ success: boolean; data?: string; error?: string }> {
  const apiKey = process.env.BLACKBOX_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Falta configurar BLACKBOX_API_KEY en .env.local" };
  }

  try {
    const response = await fetch("https://api.blackbox.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "blackboxai/blackbox-pro",
        messages: [
          { role: "system", content: "Eres Blackbox, un asistente de inteligencia artificial integrado en la plataforma interna del Colegio de Psicopedagogía. Tu función es asistir al administrador en tareas operativas, administrativas y técnicas relacionadas con el sistema, la gestión institucional y la bitácora. Debes responder de forma clara, profesional y concisa, utilizando siempre formato Markdown para estructurar la información. Prioriza respuestas prácticas, accionables y orientadas a la resolución de tareas. Evita conversaciones informales, opiniones personales o contenido fuera del contexto institucional. Si la solicitud puede afectar datos, procesos administrativos o seguridad del sistema, debes advertirlo explícitamente y sugerir buenas prácticas." },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Error de la API: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data.choices[0].message.content };
  } catch (error: any) {
    console.error("Error chatbot:", error);
    return { success: false, error: error.message || "Error al conectar con la IA" };
  }
}
