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
      const data = await redis.get<TimelineEntry[]>("timeline_data");
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
