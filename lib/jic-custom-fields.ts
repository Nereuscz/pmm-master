/**
 * Definice JIC custom polí a jejich variant pro přiřazení v aplikaci.
 * Odpovídá konfiguraci v Asaně (Project Phase, Plán/realita, 1YG fiscal 2026, TOP LP 2026).
 */

export type CustomFieldDef = {
  id: string;
  name: string;
  type: "single" | "multi";
  options: string[];
};

export const JIC_CUSTOM_FIELDS: CustomFieldDef[] = [
  {
    id: "project_phase",
    name: "Project Phase",
    type: "single",
    options: ["Ideation", "Initiation", "Planning", "Execution", "Closing", "Closed"],
  },
  {
    id: "plan_realita",
    name: "Plán/realita",
    type: "single",
    options: ["ON TIME", "DELAY", "ON HOLD", "SUSTAINABILITY"],
  },
  {
    id: "duvernost",
    name: "Důvěrnost",
    type: "single",
    options: ["DŮVĚRNÉ", "VEŘEJNÉ"],
  },
  {
    id: "proces",
    name: "Proces",
    type: "single",
    options: ["PM 2026", "PPM 2026", "PM 2024", "PPM 2024"],
  },
  {
    id: "1yg_fiscal_2026",
    name: "1YG fiscal 2026",
    type: "multi",
    options: [
      "8 podnikatelek v startup midtrack",
      "X mil. Kč? Rozpočet",
      "1% ? Zisk Z vč K výnosům celkem",
      "< 10% Nechtěná fluktuace zaměstnanců",
      "50+ NPS",
      "5 Podpořené Spin off firmy",
      "7 mil EUR - Objem získaných investic",
      "15 Prostupů Startup - Scaleup",
      "40 Projektů / Firem JIC Booster, ??? JIC Base",
      "10 prostupů Student - Startup",
      "2 - Počet globálně úspěšných firem",
    ],
  },
  {
    id: "top_lp_2026",
    name: "TOP LP 2026",
    type: "multi",
    options: [
      "Zefektivnění interního řízení (proces, projekt, produkt)",
      "Posílení / zkvalitnění řízení brandu JICu a podbrandů",
      "Zvýšit kvalitu & Kvantitu Dealflow (+ rozš.regionální působnosti)",
      "Zefektivnění práce s VO",
      "JIC Leader investic",
      "Rozvoj týmu se zaměřením na EIR",
      "Rozvoj aktivit GO Global",
    ],
  },
];

/** Mapování Asana názvů polí na naše ID. */
export const ASANA_FIELD_TO_ID: Record<string, string> = {
  "Project Phase": "project_phase",
  "Plán/realita": "plan_realita",
  "Důvěrnost": "duvernost",
  "Proces": "proces",
  "1YG fiscal 2026": "1yg_fiscal_2026",
  "TOP LP 2026": "top_lp_2026",
};

/** Vrátí definici pole podle Asana názvu. */
export function getFieldDefByAsanaName(name: string): CustomFieldDef | undefined {
  const id = ASANA_FIELD_TO_ID[name];
  return id ? JIC_CUSTOM_FIELDS.find((f) => f.id === id) : undefined;
}
