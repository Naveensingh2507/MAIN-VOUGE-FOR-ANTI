import { supabase } from "./supabaseClient";
import type { Garment } from "@/state/AppState";

export async function fetchGarments(userId: string): Promise<Garment[]> {
  const { data, error } = await supabase
    .from("garments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching garments:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: Number(row.id),
    name: row.name,
    category: row.category,
    colorHex: row.color_hex,
    tags: row.tags,
    imageUrl: row.image_url,
    garment_dna: row.garment_dna,
  }));
}

export async function insertGarment(userId: string, garment: Omit<Garment, "id">): Promise<Garment | null> {
  const { data, error } = await supabase
    .from("garments")
    .insert({
      user_id: userId,
      name: garment.name,
      category: garment.category,
      color_hex: garment.colorHex,
      tags: garment.tags,
      image_url: garment.imageUrl,
      garment_dna: garment.garment_dna,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting garment:", error);
    return null;
  }

  return {
    id: Number(data.id),
    name: data.name,
    category: data.category,
    colorHex: data.color_hex,
    tags: data.tags,
    imageUrl: data.image_url,
    garment_dna: data.garment_dna,
  };
}

export async function updateGarmentDB(userId: string, id: number, patch: Partial<Garment>): Promise<boolean> {
  const updates: any = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.colorHex !== undefined) updates.color_hex = patch.colorHex;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;
  if (patch.garment_dna !== undefined) updates.garment_dna = patch.garment_dna;

  if (Object.keys(updates).length === 0) return true;

  const { error } = await supabase
    .from("garments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating garment:", error);
    return false;
  }
  return true;
}

export async function deleteGarmentDB(userId: string, id: number): Promise<boolean> {
  const { error } = await supabase
    .from("garments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting garment:", error);
    return false;
  }
  return true;
}
