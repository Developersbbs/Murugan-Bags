export async function exportCategories() {
  try {
    const res = await fetch("http://localhost:5000/api/categories/export/all", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return { error: "Failed to fetch categories" };
    }

    const json = await res.json();
    console.log("[Export] Response from backend:", json);

    if (Array.isArray(json)) {
      return { data: json };
    }

    return { error: "Invalid response format" };
  } catch (err) {
    console.error("Error exporting categories:", err);
    return { error: "Something went wrong while fetching categories." };
  }
}
