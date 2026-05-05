import { supabase } from "../db/supabaseClient.js";

export const listFoodRecords = async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const { data, error } = await supabase
    .from("kondisi_makanan")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data });
};
