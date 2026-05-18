"use server";

import fs from "fs/promises";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "timeline.json");

export type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  description: string;
  tags: string[];
  type: 'extra' | 'pending';
};

// Initialize data file if it doesn't exist
async function ensureDataFile() {
  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    try {
      await fs.access(dataFilePath);
    } catch {
      // If file doesn't exist, create it with empty array
      await fs.writeFile(dataFilePath, JSON.stringify([]), "utf-8");
    }
  } catch (error) {
    console.error("Failed to ensure data file:", error);
  }
}

export async function getTimelineData(): Promise<TimelineEntry[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(dataFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading timeline data:", error);
    return [];
  }
}

export async function saveTimelineData(data: TimelineEntry[]) {
  await ensureDataFile();
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error saving timeline data:", error);
    return { success: false };
  }
}
