import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgeCheck,
  Heart,
  Leaf,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import "./styles.css";

const asset = (name) => `/assets/${name}`;
const hotlineNumber = "+14302570369";
const whatsappHref = "https://wa.me/14302570369";
const telHref = "tel:+14302570369";

const customerAvatars = Array.from({ length: 16 }, (_, index) =>
  asset(`avatar-${String(index + 1).padStart(2, "0")}.jpg`)
);

const customerAvatar = (index) => customerAvatars[index % customerAvatars.length];

const getClientId = () => {
  const key = "ago-reel-client-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, value);
  return value;
};

const compactCount = (count) => {
  if (count < 10000) return new Intl.NumberFormat("en-US").format(count);
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
};

const parseCompactCount = (value) => {
  const text = String(value || "").trim().toUpperCase();
  if (text.endsWith("K")) return Math.round(Number(text.replace("K", "")) * 1000);
  return Number(text) || 0;
};

const collectFormFields = (form) =>
  Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ])
  );

const getTrackingContext = () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || window.localStorage.getItem("affiliate_ref") || "";
  const visitorId =
    window.localStorage.getItem("visitor_id") ||
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem("visitor_id", visitorId);
  if (ref) window.localStorage.setItem("affiliate_ref", ref);
  return {
    ref,
    visitorId,
    landing_page: window.location.pathname + window.location.search,
    source_url: window.location.href,
    userAgent: navigator.userAgent,
  };
};

async function trackClickIfNeeded() {
  const { ref, visitorId, landing_page, source_url } = getTrackingContext();
  if (!ref) return null;
  const response = await fetch("/api/tracking-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref,
      visitorId,
      landing_page,
      source_url,
      device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop",
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

const trackInteraction = (eventType) => {
  const tracking = getTrackingContext();
  fetch("/api/tracking-interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: tracking.visitorId,
      refCode: tracking.ref || "organic",
      eventType,
      landingPage: tracking.landing_page
    })
  }).catch(() => {});
};

async function submitLead(source, fields) {
  const tracking = getTrackingContext();
  const response = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      fields,
      ref: tracking.ref,
      visitorId: tracking.visitorId,
      landing_page: tracking.landing_page,
      source_url: tracking.source_url,
    }),
  });
  if (!response.ok) throw new Error("Could not submit lead.");
  return response.json();
}

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M16.04 3.2c-7.03 0-12.74 5.66-12.74 12.62 0 2.23.6 4.42 1.73 6.34L3.2 28.8l6.83-1.79a12.82 12.82 0 0 0 6.01 1.52c7.03 0 12.76-5.66 12.76-12.62S23.07 3.2 16.04 3.2Zm0 22.99c-1.91 0-3.78-.51-5.41-1.48l-.39-.23-4.05 1.06 1.08-3.91-.26-.4a10.17 10.17 0 0 1-1.58-5.41c0-5.67 4.76-10.28 10.61-10.28 5.86 0 10.62 4.61 10.62 10.28 0 5.68-4.76 10.37-10.62 10.37Zm5.82-7.74c-.32-.16-1.88-.92-2.17-1.02-.29-.11-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.24-.69.08-.32-.16-1.35-.49-2.56-1.57-.95-.84-1.59-1.87-1.77-2.19-.18-.31-.02-.48.14-.64.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.69-.98-2.31-.26-.6-.52-.52-.71-.53h-.61c-.21 0-.55.08-.84.39-.29.31-1.11 1.07-1.11 2.61s1.14 3.03 1.3 3.24c.16.21 2.24 3.38 5.43 4.74.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.76 2.14-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.61-.37Z"
      />
    </svg>
  );
}

const ctas = {
  primary: "Get Free Fertility Consultation",
  fit: "Check If This Routine Fits You",
};

const scrollSections = [
  { id: "top", label: "Home" },
  { id: "products", label: "Products" },
  { id: "benefits", label: "Benefits" },
  { id: "reviews", label: "Reviews" },
  { id: "faq", label: "Questions" },
  { id: "consultation", label: "Consultation" },
];

const countryCodes = [
  ["US", "+1"],
  ["VN", "+84"],
  ["TH", "+66"],
  ["SG", "+65"],
  ["MY", "+60"],
  ["ID", "+62"],
  ["PH", "+63"],
  ["AU", "+61"],
  ["GB", "+44"],
  ["CA", "+1"],
];

const addressSuggestions = [
  "New York, United States",
  "California, United States",
  "Texas, United States",
  "Florida, United States",
  "Hanoi, Vietnam",
  "Ho Chi Minh City, Vietnam",
  "Bangkok, Thailand",
  "Singapore",
  "Kuala Lumpur, Malaysia",
  "Jakarta, Indonesia",
];

const products = [
  {
    name: "AGO MOM",
    label: "For Her",
    image: asset("ago-mom.png"),
    holderImage: asset("ago-mom-holder-placeholder.png"),
    ingredients: [
      { name: "Goji berry", benefit: "provides antioxidants and supports immune health." },
      { name: "Dong quai", benefit: "supports hormone balance and menstrual wellness." },
      { name: "Cuscuta chinensis", benefit: "supports kidney, immune, and reproductive health." },
      { name: "Morinda officinalis", benefit: "supports reproductive vitality and kidney wellness." },
      { name: "Myo-Inositol", benefit: "supports hormone balance, ovulation, and egg quality." },
      { name: "Ginseng", benefit: "supports energy, immunity, and vitality." },
    ],
    benefits: [
      "Egg quality & hormone balance",
      "Ovulation & menstrual wellness",
      "Vitality & warm circulation",
    ],
  },
  {
    name: "AGO DAD",
    label: "For Him",
    image: asset("ago-dad.png"),
    holderImage: asset("ago-dad-holder-placeholder.png"),
    ingredients: [
      { name: "Schisandra chinensis", benefit: "supports endurance, liver health, and stress resistance." },
      { name: "Plantago asiatica seed", benefit: "supports urinary health and natural detoxification." },
      { name: "Raspberry", benefit: "rich in antioxidants and supports male reproductive wellness." },
      { name: "Cuscuta chinensis", benefit: "supports kidney function, vitality, and reproductive health." },
      { name: "Goji berry", benefit: "supports liver, kidney, vision, and sperm quality." },
      { name: "Eucommia ulmoides", benefit: "supports kidney health, bones, tendons, and overall strength." },
    ],
    benefits: [
      "Sperm quality and health",
      "Male performance & vitality",
      "Kidney strength and endurance",
    ],
  },
];

const catalogProducts = [
  ...products,
  {
    name: "AGO TUMOR",
    label: "Overall Reproductive Wellness",
    image: asset("ago-tumor.png"),
    ingredients: [
      { name: "Clerodendrum chinense", benefit: "supports menstrual regulation and inflammatory balance." },
      { name: "Clerodendrum inerme", benefit: "supports inflammatory balance and tissue comfort." },
      { name: "Leonurus japonicus", benefit: "supports uterine health and cycle balance." },
      { name: "Phellodendron amurense", benefit: "supports detoxification and internal cooling." },
      { name: "Cyperus rotundus powder", benefit: "supports menstrual comfort and circulation." },
    ],
    benefits: [
      "Uterine & tissue comfort",
      "Inflammatory balance",
      "Detoxification & cooling",
    ],
  },
  {
    name: "AGO WOMEN",
    label: "Female Vitality",
    image: asset("ago-women.png"),
    ingredients: [
      { name: "Rehmannia glutinosa root extract", benefit: "supports blood nourishment, kidney function, and vitality." },
      { name: "Dioscorea opposita rhizome", benefit: "supports digestion, spleen function, and energy." },
      { name: "Cyperus rotundus rhizome", benefit: "supports menstrual comfort and cycle balance." },
      { name: "Paeonia suffruticosa root bark", benefit: "supports circulation and inflammatory balance." },
      { name: "Cornus officinalis fruit", benefit: "supports liver, kidney, and vitality." },
      { name: "Anemarrhena asphodeloides rhizome", benefit: "supports internal balance and hormone wellness." },
    ],
    benefits: [
      "Female cycle balance",
      "Blood nourishment & vitality",
      "Kidney and liver support",
    ],
  },
  {
    name: "AGO MEN",
    label: "Male Vitality",
    image: asset("ago-men.png"),
    ingredients: [
      { name: "Cuscuta powder", benefit: "supports kidney function and male vitality." },
      { name: "Schisandra powder", benefit: "supports liver health, endurance, and fatigue resistance." },
      { name: "Goji berry powder", benefit: "supports liver, kidney, vision, and immunity." },
      { name: "Plantago seed powder", benefit: "supports urinary, kidney, and bladder health." },
      { name: "Deer velvet powder", benefit: "supports vitality, bone strength, and blood production." },
    ],
    benefits: [
      "Male vitality & stamina",
      "Kidney & bladder health",
      "Strength & recovery",
    ],
  },
  {
    name: "AGO EVA",
    label: "Herbal Wellness",
    image: asset("ago-eva.png"),
    ingredients: [
      { name: "Leonurus japonicus / Motherwort", benefit: "supports uterine health and blood circulation." },
      { name: "Clerodendrum philippinum", benefit: "supports liver function and detoxification." },
      { name: "Phellodendron bark", benefit: "supports urinary tract health and internal cooling." },
      { name: "Clerodendrum chinense", benefit: "supports female reproductive wellness and inflammatory balance." },
      { name: "Cyperus powder", benefit: "supports menstrual comfort and lower abdominal ease." },
    ],
    benefits: [
      "Uterine health & circulation",
      "Gynecological comfort",
      "Menstrual ease & support",
    ],
  },
  {
    name: "A12 MOM",
    label: "Women Fertility Nutrients",
    image: asset("a12-mom.png"),
    ingredients: [
      { name: "Zinc Gluconate", benefit: "supports ovulation, immunity, and reproductive wellness." },
      { name: "Japanese Teasel Root Extract", benefit: "supports blood circulation and uterine warmth." },
      { name: "Asparagus Cochinchinensis Extract", benefit: "supports cervical mucus quality and internal balance." },
      { name: "Coenzyme Q10", benefit: "supports cellular energy and egg quality." },
      { name: "Myo-Inositol", benefit: "supports hormone balance, ovulation, and PCOS-related wellness." },
      { name: "Vitamin B12", benefit: "supports red blood cell production, energy, and pregnancy preparation." },
    ],
    benefits: [
      "Ovulation support",
      "Egg quality & cellular energy",
      "Pregnancy preparation",
    ],
  },
  {
    name: "AGO BEAUTY",
    label: "Beauty and Female Wellness",
    image: asset("ago-beauty.png"),
    ingredients: [
      { name: "Cyperus rotundus", benefit: "supports menstrual regulation and menstrual comfort." },
      { name: "Chinese yam", benefit: "supports digestion, energy, and kidney-spleen balance." },
      { name: "Processed Rehmannia root", benefit: "supports blood nourishment and hormone balance." },
      { name: "Peony root bark", benefit: "supports circulation and inflammatory balance." },
      { name: "Poria cocos", benefit: "supports digestion and fluid metabolism." },
      { name: "Collagen peptide", benefit: "supports skin, hair, nails, and connective tissue." },
    ],
    benefits: [
      "Skin, hair, & nails support",
      "Hormone balance support",
      "Menstrual comfort & regularity",
    ],
  },
  {
    name: "AGO MAMA",
    label: "Pregnancy Nutrient Support",
    image: asset("ago-mama.png"),
    ingredients: [
      { name: "Antler powder", benefit: "provides natural calcium and supports bone strength." },
      { name: "Zinc gluconate", benefit: "supports immunity and reproductive health." },
      { name: "Vitamin C", benefit: "supports immunity, collagen formation, and connective tissue." },
      { name: "Magnesium oxide", benefit: "supports muscle, nerve, and bone function." },
      { name: "DHA", benefit: "supports brain and eye development." },
      { name: "Vitamin D3", benefit: "supports calcium absorption and bone health." },
    ],
    benefits: [
      "Maternal nutrient support",
      "Calcium absorption & bones",
      "Immunity & development",
    ],
  },
  {
    name: "BACH TRINH NU",
    label: "Female Uterine Support",
    image: asset("bach-trinh-nu.png"),
    ingredients: [
      { name: "Crinum latifolium leaf", benefit: "supports uterine, ovarian, and immune wellness." },
      { name: "Carica papaya leaf", benefit: "supports immunity and digestion." },
      { name: "Celastrus hindsii leaves", benefit: "supports liver function and detoxification." },
      { name: "Curcuma longa powder", benefit: "supports antioxidant and inflammatory balance." },
      { name: "Panax notoginseng powder", benefit: "supports circulation and swelling comfort." },
    ],
    benefits: [
      "Uterine & ovarian wellness",
      "Immunity & liver function",
      "Antioxidant & circulation",
    ],
  },
  {
    name: "CHILL POLYTIC",
    label: "Fibroid and Cyst Support",
    image: asset("CHILL POLYTIC.png"),
    ingredients: [
      { name: "Angelica sinensis", benefit: "supports blood nourishment, menstrual balance, and menstrual comfort." },
      { name: "Crinum Latifolium", benefit: "supports uterine fibroid-related wellness and immunity." },
      { name: "Papaya leaf", benefit: "supports immunity and inflammatory balance." },
      { name: "Turmeric powder", benefit: "supports antioxidant, digestive, and inflammatory balance." },
      { name: "Ginseng powder", benefit: "supports vitality, stress resistance, and immunity." },
      { name: "Semen Cuscutae", benefit: "supports kidney, reproductive, and vision health." },
    ],
    benefits: [
      "Menstrual & fibroid wellness",
      "Immune & inflammatory support",
      "Vitality & stress resistance",
    ],
  },
  {
    name: "DE KHANG HERBLUX",
    label: "Immune Wellness",
    image: asset("de-khang-herblux.png"),
    ingredients: [
      { name: "Astragalus", benefit: "supports immunity and energy." },
      { name: "White Peony Root", benefit: "supports circulation, comfort, and inflammatory balance." },
      { name: "Dried Tangerine Peel", benefit: "supports digestion and reduces bloating." },
      { name: "Cinnamon Bark", benefit: "supports circulation and body warmth." },
      { name: "Atractylodes Macrocephala", benefit: "supports digestion, spleen function, and immunity." },
      { name: "Licorice Root", benefit: "supports digestion and inflammatory balance." },
    ],
    benefits: [
      "Immune & energy boost",
      "Digestive & spleen comfort",
      "Lung & kidney vitality",
    ],
  },
  {
    name: "DIEU KINH AMH",
    label: "Cycle and AMH Support",
    image: asset("điều kinh AMH.png"),
    ingredients: [
      { name: "Clerodendrum petasites", benefit: "supports female reproductive wellness and cycle regulation." },
      { name: "Salvia miltiorrhiza Bunge", benefit: "supports blood circulation." },
      { name: "Carthamus tinctorius L.", benefit: "supports blood flow and menstrual comfort." },
      { name: "Artemisia vulgaris L.", benefit: "supports menstruation and digestion." },
      { name: "Cyperus rotundus L.", benefit: "supports hormone balance and lower abdominal comfort." },
      { name: "Paeonia lactiflora Pall.", benefit: "supports blood nourishment and muscle relaxation." },
    ],
    benefits: [
      "AMH & cycle regulation",
      "Blood flow & menstrual comfort",
      "Hormone balance support",
    ],
  },
  {
    name: "EVA HERBLUX",
    label: "Female Cycle Support",
    image: asset("eva-herblux.png"),
    ingredients: [
      { name: "Clerodendrum", benefit: "supports menstrual regulation and inflammatory balance." },
      { name: "Leonurus sibiricus", benefit: "supports blood circulation and comfort." },
      { name: "Cyperus rotundus", benefit: "supports Qi and blood balance." },
      { name: "Leonurus japonicus", benefit: "supports uterine and menstrual wellness." },
      { name: "Phellodendron amurense", benefit: "supports gynecological comfort and internal cooling." },
      { name: "Cordyceps", benefit: "supports immunity and hormone balance." },
    ],
    benefits: [
      "Menstrual & gynecological comfort",
      "Uterine & cycle balance",
      "Immune & hormone support",
    ],
  },
  {
    name: "HAU BIEN AGO",
    label: "Male Vitality Support",
    image: asset("Hàu Biển AGO.png"),
    ingredients: [
      { name: "Cistanche deserticola", benefit: "supports kidney function and male vitality." },
      { name: "Epimedium", benefit: "supports libido and male performance." },
      { name: "Morinda officinalis", benefit: "supports kidney strength and endurance." },
      { name: "Astragalus membranaceus", benefit: "supports immunity and energy." },
      { name: "Angelica sinensis", benefit: "supports blood circulation." },
      { name: "Sea cucumber powder", benefit: "supports vitality and anti-aging wellness." },
    ],
    benefits: [
      "Male libido & performance",
      "Sperm production & zinc",
      "Vitality & kidney Yang",
    ],
  },
  {
    name: "ICH THAN HERBLUX",
    label: "Kidney and Vitality Support",
    image: asset("ich-than-herblux.png"),
    ingredients: [
      { name: "Cuscuta chinensis seeds", benefit: "supports kidney, liver, and reproductive health." },
      { name: "Lycium barbarum berries", benefit: "supports liver, kidney, and vision health." },
      { name: "Cistanche deserticola stem", benefit: "supports kidney and sexual vitality." },
      { name: "Rehmannia glutinosa root", benefit: "supports blood and kidney nourishment." },
      { name: "Angelica sinensis root", benefit: "supports circulation and menstrual wellness." },
      { name: "Plantago asiatica seeds", benefit: "supports urinary health and detoxification." },
    ],
    benefits: [
      "Kidney Yang & sexual vitality",
      "Urinary & detoxification support",
      "Liver & vision wellness",
    ],
  },
  {
    name: "MANH LUC DA",
    label: "Male Strength Support",
    image: asset("Mãnh Lực đà.png"),
    ingredients: [
      { name: "Eurycoma longifolia", benefit: "supports testosterone and male vitality." },
      { name: "Rosa laevigata extract", benefit: "supports male function and performance." },
      { name: "L-carnitine", benefit: "supports energy and sperm quality." },
      { name: "Codonopsis pilosula extract", benefit: "supports stamina and fatigue resistance." },
      { name: "Astragalus extract", benefit: "supports immunity and antioxidant protection." },
      { name: "Lycopene", benefit: "supports antioxidant protection and prostate health." },
    ],
    benefits: [
      "Testosterone & male strength",
      "Libido & performance",
      "Prostate & sperm support",
    ],
  },
  {
    name: "TIEU NANG DA",
    label: "Fibroid and Cyst Wellness",
    image: asset("tieu-nang-da.png"),
    ingredients: [
      { name: "Crinum latifolium", benefit: "supports uterine and ovarian wellness." },
      { name: "Panax notoginseng", benefit: "supports circulation and inflammatory balance." },
      { name: "Scutellaria baicalensis", benefit: "supports antioxidant protection and liver health." },
      { name: "Astragalus membranaceus", benefit: "supports immunity and recovery." },
      { name: "Hedyotis diffusa", benefit: "supports detoxification and inflammatory balance." },
      { name: "Nano Curcumin", benefit: "supports digestion, liver health, and inflammatory balance." },
    ],
    benefits: [
      "Uterine & ovarian support",
      "Detoxification & liver protection",
      "Antioxidant & skin support",
    ],
  },
  {
    name: "MAU NGUYET DA",
    label: "Menstrual Wellness",
    image: asset("mẫu nguyệt đà.png"),
    ingredients: [
      { name: "Soy germ extract", benefit: "supports female hormone balance." },
      { name: "Cyperus rotundus", benefit: "supports menstrual regulation and comfort." },
      { name: "Leonurus japonicus", benefit: "supports uterine health and circulation." },
      { name: "Angelica sinensis", benefit: "supports blood nourishment and female reproductive wellness." },
      { name: "Calcium gluconate", benefit: "supports bones, muscles, and nerve function." },
      { name: "Magnesium oxide", benefit: "supports muscle comfort, cramp relief, and energy production." },
    ],
    benefits: [
      "Female hormone balance",
      "Menstrual comfort & regulation",
      "Uterine health support",
    ],
  },
  {
    name: "MAU NGUYET DA PLUS",
    label: "Postpartum and Cycle Support",
    image: asset("mẫu nguyệt đà.png"),
    ingredients: [
      { name: "Rehmannia glutinosa", benefit: "supports blood nourishment and hormone balance." },
      { name: "Schisandra chinensis", benefit: "supports liver health, stress resistance, and vitality." },
      { name: "Leonurus japonicus", benefit: "supports uterine health and menstrual regulation." },
      { name: "Cornus officinalis", benefit: "supports kidney health and hormone balance." },
      { name: "Asparagus cochinchinensis", benefit: "supports immune and reproductive wellness." },
      { name: "Lycium barbarum / Goji berry", benefit: "rich in antioxidants and supports liver and immune health." },
    ],
    benefits: [
      "Blood nourishment & cycle regulation",
      "Ovarian function & insulin support",
      "Vitality & stress resistance",
    ],
  },
  {
    name: "OVAGEN",
    label: "Ovulation and PCOS Support",
    image: asset("OVAGEN.png"),
    ingredients: [
      { name: "Vitamin B6", benefit: "supports hormone balance and menstrual cycle stability." },
      { name: "Evening Primrose Oil", benefit: "supports hormone balance and cervical mucus quality." },
      { name: "Chromium Picolinate", benefit: "supports insulin sensitivity and PCOS-related wellness." },
      { name: "Folic Acid", benefit: "supports pregnancy preparation and cell development." },
      { name: "Myo-Inositol", benefit: "supports hormone balance and natural ovulation." },
      { name: "Coenzyme Q10", benefit: "supports egg quality and ovarian energy." },
    ],
    benefits: [
      "Hormone balance & cycle stability",
      "Egg quality & energy",
      "Ovulation & pregnancy preparation",
    ],
  },
  {
    name: "PHU HUONG DA",
    label: "Feminine Herbal Cleanser",
    image: asset("phụ hương đà.png"),
    ingredients: [
      { name: "Cnidium monnieri", benefit: "supports relief from itching and intimate discomfort." },
      { name: "Coptis chinensis", benefit: "supports antibacterial and inflammatory balance." },
      { name: "Phellodendron amurense", benefit: "supports gynecological comfort and discharge control." },
      { name: "Green tea", benefit: "supports cleansing, soothing, and antioxidant protection." },
      { name: "Piper betle", benefit: "supports natural antiseptic care and feminine hygiene." },
    ],
    benefits: [
      "Feminine hygiene cleansing",
      "Soothe intimate discomfort",
      "Gynecological wellness",
    ],
  },
  {
    name: "TIEN LIET TUYEN HERBLUX",
    label: "Prostate Wellness",
    image: asset("tien-liet-tuyen-herblux.png"),
    ingredients: [
      { name: "Saw Palmetto extract", benefit: "supports prostate and urinary function." },
      { name: "Pumpkin seed extract", benefit: "supports urinary and prostate health." },
      { name: "Crinum latifolium extract", benefit: "supports inflammatory balance and swelling comfort." },
      { name: "Pygeum africanum extract", benefit: "supports urinary flow and frequent urination comfort." },
      { name: "L-Arginine", benefit: "supports circulation and male function." },
      { name: "Zinc gluconate", benefit: "supports prostate, immune, and reproductive health." },
    ],
    benefits: [
      "Prostate & urinary support",
      "Urinary flow comfort",
      "Reproductive wellness",
    ],
  },
  {
    name: "TUE TINH NANG",
    label: "Female Wellness Formula",
    image: asset("tue-tinh.png"),
    ingredients: [
      { name: "Ginseng", benefit: "supports vitality and overall health." },
      { name: "Dong Quai", benefit: "supports blood circulation and Qi balance." },
      { name: "Licorice Root", benefit: "supports digestion and harmonizes the formula." },
      { name: "White Peony Root", benefit: "supports relaxation and hormone balance." },
      { name: "Ophiopogon Japonicus", benefit: "supports detoxification and cardiovascular wellness." },
      { name: "Cyperus Rotundus", benefit: "supports comfort and nervous system balance." },
    ],
    benefits: [
      "Hormone balance & relaxation",
      "Vitality & immunity",
      "Detoxification support",
    ],
  },
  {
    name: "U XO HERBLUX",
    label: "Fibroid Wellness Support",
    image: asset("uxo-herblux.png"),
    ingredients: [
      { name: "Crinum latifolium", benefit: "supports uterine fibroid, ovarian cyst, and inflammatory balance." },
      { name: "Hedyotis diffusa", benefit: "supports detoxification and inflammatory balance." },
      { name: "Clerodendrum", benefit: "supports gynecological and menstrual wellness." },
      { name: "Coix lacryma-jobi", benefit: "supports urination, digestion, and immunity." },
      { name: "Imperata cylindrica", benefit: "supports detoxification, urination, and internal cooling." },
    ],
    benefits: [
      "Uterine fibroid & ovarian cyst wellness",
      "Gynecological & menstrual support",
      "Detoxification & cooling",
    ],
  },
  {
    name: "VSHM TUE TINH",
    label: "Respiratory and Immune Support",
    image: asset("vshm-tue-tinh.png"),
    ingredients: [
      { name: "Ginseng", benefit: "supports vitality and overall health." },
      { name: "Dong Quai", benefit: "supports blood circulation and Qi balance." },
      { name: "Balloon Flower", benefit: "supports respiratory comfort." },
      { name: "Ganoderma Lucidum", benefit: "supports immunity and antioxidant protection." },
      { name: "White Peony Root", benefit: "supports hormone balance and relaxation." },
      { name: "Red Ginseng", benefit: "supports immunity, energy, and stress resistance." },
    ],
    benefits: [
      "Immune & energy support",
      "Stress resistance & vitality",
      "Qi & blood balance",
    ],
  },
  {
    name: "XMEN HERBLUX",
    label: "Men's Vitality Formula",
    image: asset("xmen-herblux.png"),
    ingredients: [
      { name: "Rehmannia glutinosa", benefit: "supports blood, kidney function, and male vitality." },
      { name: "Atractylodes macrocephala", benefit: "supports digestion, energy, and immunity." },
      { name: "Lycium barbarum / Goji berry", benefit: "supports blood nourishment and circulation." },
      { name: "Cnidium monnieri", benefit: "supports kidney health and male vitality." },
      { name: "Eucommia ulmoides", benefit: "supports liver, kidney, bones, and joints." },
      { name: "Epimedium / Horny Goat Weed", benefit: "supports libido and male function." },
    ],
    benefits: [
      "Male performance & Yang vitality",
      "Kidney, bone, and joint support",
      "Immune & lung health",
    ],
  },
];

function CtaButton({ children, href = "#consultation", variant = "primary", size = "normal" }) {
  return (
    <a className={`cta cta-${variant} cta-${size}`} href={href}>
      <span>{children}</span>
    </a>
  );
}

function SectionHeader({ eyebrow, title, text, light = false }) {
  const titleClass = `title-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
  return (
    <div className={`section-header ${titleClass} ${light ? "section-header-light" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>
        {String(title)
          .split("|")
          .map((line, index, lines) => (
            <React.Fragment key={`${line}-${index}`}>
              <span>{line}</span>
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
      </h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function PhoneField({ label = "Phone Number", compact = false, name = "phone", showLabel = true }) {
  return (
    <label className="phone-field">
      {showLabel && label}
      <div className={`phone-combo ${compact ? "phone-combo-compact" : ""}`}>
        <select name={`${name}-country-code`} defaultValue="+1" aria-label="Country code">
          {countryCodes.map(([country, code]) => (
            <option key={`${country}-${code}`} value={code}>
              {country} {code}
            </option>
          ))}
        </select>
        <input
          required
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9\\s()-]{6,18}"
          placeholder={label}
        />
      </div>
    </label>
  );
}

function AddressField({ label = "Address", name = "address", required = false, showLabel = true }) {
  return (
    <label className="address-field">
      {showLabel && label}
      <input
        required={required}
        name={name}
        list="address-suggestions"
        autoComplete="street-address"
        placeholder={label}
      />
    </label>
  );
}

function CustomSelect({ label, name, placeholder = "Select one", options }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const selected = options.find((option) => option === value);

  return (
    <label className="custom-select-field">
      {label}
      <input name={name} value={value} readOnly className="custom-select-native" tabIndex="-1" />
      <div className={`custom-select ${open ? "open" : ""}`}>
        <button
          type="button"
          className="custom-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selected || placeholder}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="custom-select-menu" role="listbox" tabIndex="-1">
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                key={option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function SharedDatalists() {
  return (
    <datalist id="address-suggestions">
      {addressSuggestions.map((item) => (
        <option key={item} value={item} />
      ))}
    </datalist>
  );
}

function ConsultationFields({ compact = false }) {
  const firedFocus = useRef(false);
  const handleFocus = () => {
    if (firedFocus.current) return;
    firedFocus.current = true;
    if (typeof trackInteraction === "function") {
      trackInteraction(compact ? "popup_focus" : "form_focus");
    }
  };

  return (
    <>
      <div className={`form-grid ${compact ? "form-grid-compact" : ""}`} onFocus={handleFocus}>
        <label>
          Full Name
          <input required name="name" />
        </label>
        <label>
          Age
          <input required name="age" type="number" min="18" />
        </label>
        <PhoneField compact={compact} />
        <AddressField />
        <CustomSelect
          label="How long have you been trying?"
          name="trying"
          options={["Less than 6 months", "6-12 months", "1-2 years", "More than 2 years"]}
        />
        <label>
          Main concern
          <textarea name="concern" rows="3" />
        </label>
        <CustomSelect
          label="Are you trying naturally or preparing for IVF?"
          name="path"
          options={["Trying naturally", "Preparing for IVF", "Not sure yet"]}
        />
        <button className="cta form-button" type="submit">
          Submit & Get My Free Plan &rarr;
        </button>
      </div>
    </>
  );
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="leaf leaf-a" />
      <div className="leaf leaf-b" />
      <div className="hero-copy" data-reveal>
        <p className="eyebrow">AGO MOM + AGO DAD</p>
        <h1>Still Hoping for a Baby After Months or Years of Trying?</h1>
        <p className="hero-subtitle">
          When every month feels like another question mark, you deserve a calmer plan. AGO MOM + AGO DAD
          supports both egg health and sperm health with daily guidance for couples.
        </p>
        <ul className="hero-bullets">
          {[
            "For couples who feel tired of guessing",
            "Supports both women and men",
            "Simple daily routine you can follow at home",
            "Free 1-on-1 consultation before starting",
          ].map((item) => (
            <li key={item}>
              <BadgeCheck size={18} /> {item}
            </li>
          ))}
        </ul>
        <div className="hero-actions">
          <CtaButton>{ctas.primary}</CtaButton>
          <CtaButton variant="secondary" href="#benefits">
            {ctas.fit}
          </CtaButton>
        </div>
      </div>
      <div className="hero-visual" data-reveal>
        <img src={asset("hero-pregnant-couple.png")} alt="Happy pregnant couple holding a positive test and ultrasound" />
        <div className="product-float-container">
          <img
            className="product-float product-float-mom"
            src={asset("ago-mom.png")}
            alt="AGO MOM product"
          />
          <img
            className="product-float product-float-dad"
            src={asset("ago-dad.png")}
            alt="AGO DAD product"
          />
        </div>
      </div>
    </section>
  );
}

function FertilityIssues() {
  const groups = [
    {
      audience: "For Women",
      items: [
        ["Poor egg quality, irregular menstruation, low AMH", asset("Poor Egg Quality placeholder.png")],
        ["Ovarian cysts, fibroids, gynecological infections", asset("PCOSHormone Imbalance placeholder.webp")],
        ["History of miscarriage or ectopic pregnancy", asset("Low AMH  Low Reserve placeholder.jpg")],
      ],
    },
    {
      audience: "For Men",
      items: [
        ["Weak sperm, low count, high abnormality rate", asset("Weak Sperm placeholder.jpg")],
        ["Premature ejaculation, erectile dysfunction", asset("For Men fertility concern placeholder.jpg")],
        ["Fatigue, low libido, weak physical condition", asset("Energy and Consistency placeholder.jpg")],
      ],
    },
  ];

  return (
    <section className="section fertility-issues">
      <div className="fertility-issues-grid">
        {groups.map((group) => (
          <article className="fertility-issue-panel" data-reveal key={group.audience}>
            <div className="fertility-ribbon">
              <strong>Are You Facing Fertility Issues?</strong>
              <span>{group.audience}</span>
            </div>
            <div className="fertility-issue-items">
              {group.items.map(([text, image]) => (
                <div className="fertility-issue-item" key={text}>
                  <img src={image} alt={`${group.audience} fertility concern placeholder`} />
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <p className="fertility-note">
              Fertility is not only one partner's burden. A shared routine helps couples stop blaming themselves
              and start supporting both sides of the journey.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FibroidComplications() {
  const complications = [
    {
      title: "Infertility, subfertility",
      text: "Fibroids may make the journey feel uncertain and leave couples wondering what to focus on first.",
      image: asset("Infertility subfertility placeholder.jpg"),
      featured: true,
    },
    {
      title: "Infectious complication",
      text: "Ovarian cyst or fibroid concerns can add stress, discomfort and more questions before pregnancy.",
      image: asset("Infectious complication placeholder.jpg"),
    },
    {
      title: "Compression of surrounding organs",
      text: "Ongoing pressure and discomfort can affect daily wellbeing and make consistency harder.",
      image: asset("Compression of surrounding organs placeholder.jpg"),
    },
    {
      title: "Ovarian torsion or rupture",
      text: "If symptoms become severe, medical review matters. Wellness support should start with clarity.",
      image: asset("before-condition-placeholder.png"),
    },
  ];

  return (
    <section className="section fibroid-complications">
      <div className="fibroid-layout">
        <div className="fibroid-title-card" data-reveal>
          <h2>
            Dangerous complications
            <br />
            of fibroids and cysts
          </h2>
          <CtaButton size="compact">Click to order now</CtaButton>
        </div>
        <div className="fibroid-cards">
          {complications.map((item) => (
            <article className={`fibroid-card${item.featured ? " fibroid-card-featured" : ""}`} data-reveal key={item.title}>
              <img src={item.image} alt={`${item.title} placeholder`} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfertilityCauses() {
  const causes = [
    "Hormonal imbalance or irregular cycles that make timing feel confusing",
    "Poor egg quality or sperm quality that may reduce confidence each month",
    "Nutrient gaps, stress and lifestyle habits that make consistency harder",
    "Ovarian cysts, fibroids or gynecological concerns that need clearer support",
    "Male fertility concerns such as low count, weak motility or abnormal sperm",
    "Age-related pressure that makes couples feel time is moving too fast",
    "Underlying health factors that should be reviewed before choosing a routine",
  ];

  return (
    <section className="section infertility-causes">
      <div className="causes-shell" data-reveal>
        <div className="causes-image">
          <img src={asset("Couple facing fertility concern placeholder.png")} alt="Couple facing fertility concern placeholder" />
        </div>
        <div className="causes-copy">
          <h2>
            Causes of Infertility
            <br />
            - Subfertility
          </h2>
          <ul>
            {causes.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PainPoints() {
  const points = [
    ["Irregular Cycles", asset("Irregular Cycles placeholder.jpg")],
    ["Poor Egg Quality", asset("Poor Egg Quality placeholder.png")],
    ["Low AMH / Low Reserve", asset("Low AMH  Low Reserve placeholder.jpg")],
    ["PCOS & Hormone Imbalance", asset("PCOSHormone Imbalance placeholder.webp")],
    ["Weak Sperm", asset("Weak Sperm placeholder.jpg")],
    ["Thin Uterine Lining", asset("thin lterinelining placeholder.jpg")],
  ];
  return (
    <section className="section cream" id="concerns">
      <SectionHeader title="Why Pregnancy May Still Not Happen,|Even When You Keep Trying" />
      <div className="card-grid six">
        {points.map(([title, image], index) => (
          <article className="soft-card concern-card" data-reveal key={title} style={{ "--d": `${index * 70}ms` }}>
            <div className="concern-image-box">
              <img src={image} alt={`${title} placeholder`} />
            </div>
            <h3>{title}</h3>
            <p>One small concern can make every cycle feel heavier. A clearer daily plan helps you know where to start.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [hoveredSide, setHoveredSide] = useState(null);
  const beforeWidth = hoveredSide === "before" ? "64%" : hoveredSide === "after" ? "36%" : "50%";
  const afterWidth = hoveredSide === "after" ? "64%" : hoveredSide === "before" ? "36%" : "50%";
  const dividerPosition = hoveredSide === "before" ? "64%" : hoveredSide === "after" ? "36%" : "50%";
  return (
    <section className="section before-after" id="before-after">
      <SectionHeader
        eyebrow="Before / After"
        title="Move From Waiting and Worry to a Clear Daily Support Plan"
        text="A better journey starts when both partners stop guessing and begin supporting the routine together."
      />
      <div
        className={`ba-frame${hoveredSide ? " is-hovering" : ""}`}
        style={{ "--divider": dividerPosition }}
        data-reveal
        tabIndex="0"
        aria-label="Hover to compare before and after support"
        onMouseLeave={() => setHoveredSide(null)}
        onBlur={() => setHoveredSide(null)}
      >
        <div className="ba-split">
          <div
            className="ba-panel ba-before"
            style={{ width: beforeWidth, flex: `0 0 ${beforeWidth}` }}
            onMouseEnter={() => setHoveredSide("before")}
            onFocus={() => setHoveredSide("before")}
            tabIndex="0"
          >
            <img src={asset("before-condition-placeholder.png")} alt="Before using AGO MOM and AGO DAD placeholder" />
            <span>Before Support</span>
          </div>
          <div
            className="ba-panel ba-after"
            style={{ width: afterWidth, flex: `0 0 ${afterWidth}` }}
            onMouseEnter={() => setHoveredSide("after")}
            onFocus={() => setHoveredSide("after")}
            tabIndex="0"
          >
            <img src={asset("your-fertility-journey-deserves-support-from-both-sides.jpg")} alt="After using AGO MOM and AGO DAD" />
            <span>After Support</span>
          </div>
        </div>
        <div className="ba-divider" />
        <div className="ba-caption">
          <p>Before: stress, blame, scattered advice and no clear daily routine.</p>
          <p>After: a calmer plan, shared support and guidance for both partners.</p>
        </div>
      </div>
      <CtaButton variant="glow">Start Support Plan</CtaButton>
    </section>
  );
}

function ProductCatalog() {
  const [activeProduct, setActiveProduct] = useState(null);
  const loopProducts = [...catalogProducts, ...catalogProducts];
  return (
    <section className="section product-catalog" id="product-line">
      <SectionHeader
        eyebrow="Product Line"
        title="Choose the Support Routine|That Fits Your Journey"
        text="Start with the couple routine first, then choose extra support only if it truly fits your situation."
      />
      <div className="catalog-rail" data-reveal>
        <div className="catalog-grid">
        {loopProducts.map((product, index) => (
          <button className="catalog-card" type="button" onClick={() => setActiveProduct(product)} key={`${product.name}-${index}`}>
            <img src={product.image} alt={`${product.name} product placeholder`} />
            <h3>{product.name}</h3>
            <p>{product.label}</p>
            <dl>
              <dt>Ingredients</dt>
              <dd>{product.ingredients.map(i => i.name).join(", ")}</dd>
              <dt>Benefits</dt>
              <dd>{product.benefits.join(", ")}</dd>
              <dt>Usage</dt>
              <dd>Take daily after meals as guided by your consultant.</dd>
            </dl>
          </button>
        ))}
        </div>
      </div>
      {activeProduct && <CatalogProductLightbox product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </section>
  );
}

function CatalogProductLightbox({ product, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    return catalogProducts.findIndex((p) => p.name === product.name);
  });

  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const totalProducts = catalogProducts.length;

  const handleNext = () => {
    setTransitionEnabled(true);
    setCurrentIndex((prev) => (prev + 1) % totalProducts);
    setOffsetX(0);
  };

  const handlePrev = () => {
    setTransitionEnabled(true);
    setCurrentIndex((prev) => (prev - 1 + totalProducts) % totalProducts);
    setOffsetX(0);
  };

  // Dragging handlers
  const onDragStart = (clientX) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setOffsetX(0);
    setTransitionEnabled(false);
  };

  const onDragMove = (clientX) => {
    if (!isDragging) return;
    const diff = clientX - dragStartX;
    setOffsetX(diff);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setTransitionEnabled(true);

    const threshold = 60; // trigger slide change
    if (offsetX < -threshold) {
      handleNext();
    } else if (offsetX > threshold) {
      handlePrev();
    } else {
      setOffsetX(0);
    }
  };

  // Touch events
  const handleTouchStart = (e) => {
    onDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    onDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    onDragEnd();
  };

  // Mouse events
  const handleMouseDown = (e) => {
    onDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    onDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    onDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      onDragEnd();
    }
  };

  const getProductAt = (index) => {
    const wrappedIndex = (index + totalProducts) % totalProducts;
    return catalogProducts[wrappedIndex];
  };

  const currentProduct = getProductAt(currentIndex);
  const prevProduct = getProductAt(currentIndex - 1);
  const nextProduct = getProductAt(currentIndex + 1);

  const renderProductDetails = (prod, slideClass) => {
    const visualAssets = [
      "concern-egg-quality-placeholder.png",
      "concern-pcos-placeholder.png",
      "benefit-sperm-health-placeholder.png",
      "concern-irregular-cycles-placeholder.png",
      "benefit-lining-placeholder.png",
      "benefit-couple-support-placeholder.png",
    ];
    const points = [
      ...prod.ingredients.map(i => ({
        title: i.name,
        tag: "Ingredient",
        text: i.benefit
      }))
    ];
    const half = Math.ceil(points.length / 2);
    const leftPoints = points.slice(0, half);
    const rightPoints = points.slice(half);

    return (
      <div className={`catalog-slide ${slideClass}`} key={prod.name}>
        <div className="catalog-detail-layout">
          <div className="catalog-detail-points catalog-detail-left">
            {leftPoints.map((point, index) => (
              <article key={`${point.title}-${index}`}>
                <div>
                  <em>{point.tag}</em>
                  <span>{point.title}</span>
                  <p>{point.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="catalog-detail-center">
            <h2>{prod.name}</h2>
            <img src={prod.image} alt={`${prod.name} product detail`} draggable="false" />
            <strong>{prod.label}</strong>
          </div>
          <div className="catalog-detail-points catalog-detail-right">
            {rightPoints.map((point, index) => (
              <article key={`${point.title}-${index}`}>
                <div>
                  <em>{point.tag}</em>
                  <span>{point.title}</span>
                  <p>{point.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="catalog-lightbox" role="dialog" aria-modal="true" aria-label="Product catalog lightbox">
      <div className="catalog-detail slider-mode">
        <button
          className="catalog-detail-close"
          type="button"
          aria-label="Close product details"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <X />
        </button>

        {/* Navigation Arrows */}
        <button className="slider-nav-btn prev-btn" type="button" aria-label="Previous product" onClick={handlePrev}>
          &#10229;
        </button>
        <button className="slider-nav-btn next-btn" type="button" aria-label="Next product" onClick={handleNext}>
          &#10230;
        </button>

        {/* Drag/Swipe Area */}
        <div 
          className="slider-track-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div 
            className="slider-track"
            style={{
              transform: `translateX(calc(-33.3333% + ${offsetX}px))`,
              transition: transitionEnabled ? "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
              display: "flex",
              width: "300%",
              height: "100%"
            }}
          >
            {renderProductDetails(prevProduct, "prev-slide")}
            {renderProductDetails(currentProduct, "active-slide")}
            {renderProductDetails(nextProduct, "next-slide")}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="slider-dots">
          {catalogProducts.map((p, idx) => (
            <button
              key={p.name}
              type="button"
              className={`slider-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => {
                setTransitionEnabled(true);
                setCurrentIndex(idx);
                setOffsetX(0);
              }}
              aria-label={`Go to product ${p.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductReveal() {
  const [activeProduct, setActiveProduct] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="section product-reveal dark" id="products">
      <SectionHeader
        light
        title="A Daily Couple Routine for Hope, Clarity and Consistency"
        text="Because couples need more than another product. They need a plan both partners can believe in and follow."
      />
      <CoupleProductMap onOpen={setActiveProduct} />
      <CtaButton variant="gold">Find My Couple Plan</CtaButton>
      {activeProduct && (
        <ProductLightbox
          product={activeProduct}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
          onClose={() => {
            setActiveProduct(null);
            setSubmitted(false);
          }}
        />
      )}
    </section>
  );
}

function CoupleProductMap({ onOpen }) {
  const mom = products[0];
  const dad = products[1];
  const ingredientImages = {
    "Goji berry": asset("ingredient-goji-berry.webp"),
    "Dong quai": asset("ingredient-dong-quai.webp"),
    "Cuscuta chinensis": asset("ingredient-cuscuta-chinensis.jpg"),
    "Morinda officinalis": asset("ingredient-morinda-officinalis.jpg"),
    "Myo-Inositol": asset("ingredient-myo-inositol.webp"),
    "Schisandra chinensis": asset("ingredient-schisandra-chinensis.webp"),
    "Plantago asiatica seed": asset("ingredient-plantago-asiatica-seed.jpg"),
    "Eucommia ulmoides": asset("ingredient-eucommia-ulmoides.jpg"),
    "L-Arginine": asset("ingredient-l-arginine.webp"),
    Ginseng: asset("ingredient-ginseng.jpg"),
    "Raspberry": asset("ingredient-raspberry.jpg"),
  };
  const fallbackImages = [
    "benefit-sperm-health-placeholder.png",
    "benefit-lining-placeholder.png",
    "benefit-couple-support-placeholder.png",
    "concern-sperm-placeholder.png",
    "concern-irregular-cycles-placeholder.png",
  ];
  const points = [
    ...mom.ingredients
      .slice(0, 6)
      .map((item) => ({ product: mom, type: "AGO MOM", text: item.name, side: "left" })),
    ...dad.ingredients.slice(0, 6).map((item) => ({ product: dad, type: "AGO DAD", text: item.name, side: "right" })),
  ].map((point, index) => ({
    ...point,
    image: ingredientImages[point.text] || asset(fallbackImages[index % fallbackImages.length]),
  }));

  return (
    <div className="couple-product-map" data-reveal>
      <div className="ingredient-cloud ingredient-cloud-left">
        {points
          .filter((point) => point.side === "left")
          .map((point) => (
            <button type="button" className="ingredient-chip" onClick={() => onOpen(point.product)} key={`${point.type}-${point.text}`}>
              <img src={point.image} alt={point.text} />
              <strong>{point.text}</strong>
            </button>
          ))}
      </div>
      <div className="couple-products-center">
        {[mom, dad].map((product) => (
          <button className="couple-product-bottle" type="button" onClick={() => onOpen(product)} key={product.name}>
            <img src={product.holderImage || product.image} alt={`${product.name} product`} />
            <span>{product.name}</span>
          </button>
        ))}
      </div>
      <div className="ingredient-cloud ingredient-cloud-right">
        {points
          .filter((point) => point.side === "right")
          .map((point) => (
            <button type="button" className="ingredient-chip" onClick={() => onOpen(point.product)} key={`${point.type}-${point.text}`}>
              <img src={point.image} alt={`${point.text} placeholder`} />
              <strong>{point.text}</strong>
            </button>
          ))}
      </div>
    </div>
  );
}

function ProductHoverCard({ product, onOpen }) {
  return (
    <button className="product-note product-hover-card" onClick={onOpen}>
      <div className="product-card-media">
        <img src={product.holderImage || product.image} alt={`${product.name} customer holding product`} />
        <span>{product.label}</span>
      </div>
      <div className="product-card-copy">
        <PackageCheck />
        <h3>{product.name}</h3>
        <p>{product.label}</p>
        <div className="product-hover-details">
          <strong>Ingredients</strong>
          <ul>
            {product.ingredients.slice(0, 3).map((item) => (
              <li key={item.name}>{item.name}</li>
            ))}
          </ul>
          <strong>Helps support</strong>
          <ul>
            {product.benefits.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <span>Click for full details</span>
      </div>
    </button>
  );
}

function ProductLightbox({ product, onClose }) {
  return (
    <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} details`}>
      <div className="product-modal">
        <button
          className="chat-close"
          aria-label="Close product details"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <X />
        </button>
        <h2>{product.name}</h2>
        <div className="product-modal-grid">
          <div className="product-modal-image">
            <img src={product.holderImage || product.image} alt={`${product.name} product`} />
            <p>{product.label}</p>
          </div>
          <div className="product-modal-info">
            <div className="product-modal-lists">
              <section>
                <h3>Ingredients</h3>
                <ul>
                  {product.ingredients.map((item) => (
                    <li key={item.name}><strong>{item.name}</strong>: {item.benefit}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Benefits</h3>
                <ul>
                  {product.benefits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
            <a className="cta cta-gold cta-compact" href="#consultation" onClick={onClose}>
              <span>Get Consultation</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = ["Nourish the Body", "Support Hormone Balance", "Support Egg & Sperm Quality", "Guide Your Daily Routine"];
  return (
    <section className="section mint" id="how-it-works">
      <SectionHeader title="How It Works" text="A simple routine designed to be understood and followed at home." />
      <div className="timeline">
        {steps.map((step, index) => (
          <article className="timeline-card" data-reveal key={step} style={{ "--d": `${index * 100}ms` }}>
            <span>{index + 1}</span>
            <h3>{step}</h3>
            <p>Daily support that builds consistency without making your routine complicated.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BenefitGrid() {
  const benefitGroups = [
    {
      label: "For Women",
      text: "Focus on egg quality, hormone balance and a healthier monthly rhythm.",
      items: [
        ["Egg Quality Support", asset("Egg Quality Support placeholder.jpg")],
        ["Hormone Balance Support", asset("Hormone Balance Support.jpg")],
        ["Ovulation Support", asset("Ovulation Support.jpg")],
        ["Uterine Lining Support", asset("Uterine Lining Support placeholder.webp")],
      ],
    },
    {
      label: "For Men",
      text: "Support sperm health, daily vitality and consistency for the couple plan.",
      items: [
        ["Sperm Health Support", asset("Sperm Health Support placeholder.jpg")],
        ["Motility Wellness Support", asset("Motility Wellness Support placeholder.jpg")],
        ["Energy and Consistency", asset("Energy and Consistency placeholder.jpg")],
        ["Couple Fertility Support", asset("Couple Fertility Support placeholder.jpeg")],
      ],
    },
  ];
  return (
    <section className="section cream benefits-section" id="benefits">
      <SectionHeader
        title="What This Routine Helps Support"
        text="Instead of wondering what to fix first, see how the routine supports each partner's side of the journey."
      />
      <div className="benefit-groups">
        {benefitGroups.map((group, groupIndex) => (
          <article className="benefit-group" data-reveal key={group.label}>
            <div className="benefit-group-head">
              <span>{group.label}</span>
              <p>{group.text}</p>
            </div>
            <div className="benefit-group-grid">
              {group.items.map(([item, image], index) => (
                <article className="soft-card benefit-card" key={item} style={{ "--d": `${(groupIndex * 4 + index) * 60}ms` }}>
                  <div className="benefit-image-box">
                    <img src={image} alt={`${item} placeholder`} />
                  </div>
                  <h3>{item}</h3>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
      <CtaButton variant="outline">Get My Free Couple Plan</CtaButton>
    </section>
  );
}

function Comparison() {
  return (
    <section className="section compare">
      <SectionHeader title="Support Both Sides of the Journey" />
      <div className="comparison-table" data-reveal>
        <article>
          <div className="comparison-image">
            <img src={asset("only-her-tries.png")} alt="Only her tries while feeling alone with the fertility journey" />
          </div>
          <div className="comparison-copy">
            <h3>Only Her Tries</h3>
            <p>One partner carries the research, the supplements, the timing, the stress and the silent disappointment.</p>
            <ul>
              <li>Uneven effort</li>
              <li>Missing sperm health support</li>
              <li>Harder to stay consistent</li>
            </ul>
          </div>
        </article>
        <article className="highlight">
          <div className="comparison-image">
            <img src={asset("both-partners-support.png")} alt="Both partners receive support together during the fertility journey" />
          </div>
          <div className="comparison-copy">
            <h3>Both Partners Support</h3>
            <p>A shared daily plan helps both partners feel involved, supported and less alone.</p>
            <ul>
              <li>Couple-focused routine</li>
              <li>More complete wellness support</li>
              <li>Guidance for both partners</li>
            </ul>
          </div>
        </article>
      </div>
      <CtaButton variant="glow">Start Supporting Both Partners</CtaButton>
    </section>
  );
}

function DailyRoutine() {
  const steps = ["Take Daily", "Follow Your Plan", "Stay Consistent"];
  return (
    <section className="section routine" id="routine">
      <div className="split">
        <div data-reveal>
          <SectionHeader title="Daily Routine" text="Simple steps that fit into normal home life." />
          <div className="routine-steps">
            {steps.map((step, index) => (
              <article key={step} data-reveal style={{ "--d": `${index * 110}ms` }}>
                <BadgeCheck /> <span>{step}</span>
              </article>
            ))}
          </div>
          <CtaButton size="compact">Start Today</CtaButton>
        </div>
        <img data-reveal src={asset("routine-couple-placeholder.png")} alt="Daily routine placeholder" />
      </div>
    </section>
  );
}

function AuthoritySections() {
  return (
    <>
      <section className="section authority" id="introduction">
        <SectionHeader
          eyebrow="Introduction"
          title="Guidance Before You Choose"
          text="Before you order, tell us what you have been facing. We help you choose a routine that feels realistic, not overwhelming."
        />
        <div className="authority-grid">
          <article data-reveal>
            <img src={asset("dedicated-healthcare-professionals.png")} alt="Dedicated healthcare professionals" />
            <h3>Dedicated Healthcare Professionals</h3>
            <p>
              Consultants review your age, trying history, cycle concerns and partner factors before suggesting a
              daily support routine.
            </p>
          </article>
          <article data-reveal>
            <img src={asset("clear-product-explanation.png")} alt="Clear product explanation" />
            <h3>Clear Product Explanation</h3>
            <p>You can ask how AGO MOM and AGO DAD fit your real life before making a decision.</p>
          </article>
          <article data-reveal className="authority-feature">
            <img src={asset("bach-thao-duoc-herbal-medicine-factory.jpg")} alt="Bach Thao Duoc Herbal Medicine Factory" />
            <h3>Bach Thao Duoc Herbal Medicine Factory</h3>
            <p>Herbal origin, controlled production and documentation help customers feel safer before starting.</p>
          </article>
        </div>
      </section>
      <section className="section expert-insights">
        <SectionHeader
          eyebrow="Expert Insights & Guidance"
          title="Trusted Guidance Before Customers Start"
          text="Trust starts when customers understand what the routine supports, what it cannot promise and how to use it consistently."
        />
        <div className="insight-band" data-reveal>
          <ShieldCheck />
          <p>
            Every consultation should help customers feel heard first. Then we explain product fit, routine,
            lifestyle guidance and realistic wellness expectations.
          </p>
          <CtaButton variant="outline">Get Expert Guidance</CtaButton>
        </div>
      </section>
    </>
  );
}

function Stories() {
  const [activeComment, setActiveComment] = useState(2);
  const stories = useMemo(() => {
    const comments = [
      ["Jessica M.", "Austin, Texas", "Trying naturally", "After months of feeling stuck, we finally had a routine we could follow together.", "Felt supported and more hopeful"],
      ["Ashley R.", "Toronto, Ontario", "Cycle timing", "The follow-up messages helped us stay consistent instead of stopping after a few days.", "Better routine discipline"],
      ["Amanda C.", "San Diego, California", "Irregular cycle concern", "The consultation helped us understand what to focus on first before choosing a routine.", "Clearer next steps"],
      ["Sarah J.", "Calgary, Alberta", "PCOS support", "The daily plan made my routine feel less confusing and easier to stay with.", "More confident tracking"],
      ["Emily W.", "Seattle, Washington", "Trying after 12 months", "The consultation gave us a simple checklist instead of too much information.", "Clear action plan"],
      ["Lauren B.", "Vancouver, British Columbia", "Low AMH concern", "I liked that the guidance was realistic and focused on small steps I could repeat.", "Calmer daily support"],
      ["Megan T.", "Chicago, Illinois", "Couple support", "The best part was knowing both of us had a role in the journey. It felt less one-sided.", "More consistent daily habits"],
      ["Rachel S.", "Ottawa, Ontario", "Preparing together", "It helped my partner understand why both sides matter in fertility wellness.", "Shared responsibility"],
      ["Hannah C.", "Phoenix, Arizona", "Sperm health support", "My husband finally had a simple role in the routine, which made the process feel fairer.", "Couple support"],
      ["Nicole P.", "Dallas, Texas", "Hormone balance", "I appreciated that the guidance was calm and did not feel pushy.", "More confidence"],
      ["Stephanie L.", "Montreal, Quebec", "Trying naturally", "We needed something simple enough to use every day, and the plan felt easy to follow.", "Simple daily routine"],
      ["Brittany K.", "Orlando, Florida", "Egg quality support", "The consultation made the product choices easier to understand before ordering.", "Better product clarity"],
      ["Kayla D.", "Denver, Colorado", "Couple wellness", "It felt reassuring to have support for both partners instead of only focusing on me.", "Less pressure"],
      ["Melissa G.", "Edmonton, Alberta", "Trying after miscarriage", "The team answered my questions patiently and helped me choose a gentle next step.", "Felt cared for"],
      ["Heather N.", "Portland, Oregon", "Routine support", "The reminders helped us stay on track when we usually give up too quickly.", "Stayed consistent"],
      ["Samantha F.", "Boston, Massachusetts", "Cycle concern", "I liked getting a clear explanation before deciding if the routine fit us.", "Clear explanation"],
      ["Courtney A.", "Winnipeg, Manitoba", "Natural support", "The plan felt realistic for our schedule and gave us something practical to do together.", "Practical plan"],
      ["Rebecca H.", "New York, New York", "Couple support", "My partner finally understood how sperm health connects with the journey too.", "Shared understanding"],
      ["Kristen V.", "Las Vegas, Nevada", "Wellness routine", "The support felt personal, and the steps were not overwhelming.", "Personal guidance"],
      ["Michelle D.", "Mississauga, Ontario", "Preparing together", "We felt more organized after the consultation and knew what to ask next.", "More organized"],
    ];
    return comments.sort(() => Math.random() - 0.5);
  }, []);
  const visibleComments = useMemo(
    () =>
      Array.from({ length: 3 }, (_, slot) => {
        const index = (activeComment - slot + stories.length) % stories.length;
        return { item: stories[index], index, slot };
      }),
    [activeComment, stories]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveComment((current) => (current + 1) % stories.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [stories.length]);

  return (
    <section className="section stories">
      <SectionHeader
        title="Real Stories from Couples Who Needed a New Step"
        text="These stories remind new visitors that feeling stuck does not mean the journey is over. Sometimes the next step is simply a clearer plan."
      />
      <div className="comment-feed notification-loop" data-reveal>
        {visibleComments.map(({ item, index, slot }) => {
          const [name, location, status, text, result] = item;
          return (
          <article
            className="comment-card notification-card"
            key={`${name}-${activeComment}`}
            style={{ "--slot": slot }}
          >
            <div className="comment-avatar">
              <img src={customerAvatar(index)} alt={`${name} avatar`} />
            </div>
            <div className="comment-body">
              <div className="comment-meta">
                <strong>{name}</strong>
                <span>{status}</span>
                <span>{location}</span>
              </div>
              <p>{text}</p>
              <div className="comment-actions">
                <span>{result}</span>
                <span>Reply</span>
                <span>Like</span>
              </div>
              <div className="seller-feedback">
                <strong>Seller's feedback</strong>
                <p>
                  Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health.Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health.
                </p>
              </div>
            </div>
          </article>
          );
        })}
      </div>
      <CtaButton variant="outline">Ask for My Support Plan</CtaButton>
    </section>
  );
}

function CustomerProof() {
  const reviews = [
    {
      name: "Maya & Daniel",
      detail: "Trying naturally for 14 months",
      text: "The routine felt simple enough for both of us to follow. The consultation helped us stop guessing and start doing the right daily steps together.",
    },
    {
      name: "Anna P.",
      detail: "Irregular cycle concern",
      text: "I liked that the guidance was calm, practical and not scary. I could ask questions before deciding what routine fit me.",
    },
    {
      name: "Linh & Mark",
      detail: "Couple wellness support",
      text: "It made the journey feel less one-sided. We had a shared plan and reminders that helped us stay consistent.",
    },
  ];
  const chats = [
    {
      src: asset("chat-feedback-01-placeholder.png"),
      alt: "Customer chat feedback placeholder 1",
      caption: "Couple routine feedback",
    },
    {
      src: asset("chat-feedback-02-placeholder.png"),
      alt: "Customer chat feedback placeholder 2",
      caption: "Consultation follow-up",
    },
    {
      src: asset("chat-feedback-03-placeholder.png"),
      alt: "Customer chat feedback placeholder 3",
      caption: "Daily consistency message",
    },
  ];
  const [activeChat, setActiveChat] = useState(null);

  return (
    <section className="section customer-proof" id="customer-feedback">
      <SectionHeader
        eyebrow="Customer Feedback"
        title="Messages From Couples Who Started With One Small Step"
        text="The first message is often full of fear and questions. The goal is to turn that fear into one simple next step."
      />
      <div className="review-grid">
        {reviews.map((review) => (
          <article className="review-card" data-reveal key={review.name}>
            <Quote />
            <div className="stars" aria-label="5 star review">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={16} fill="currentColor" />
              ))}
            </div>
            <p>{review.text}</p>
            <h3>{review.name}</h3>
            <span>{review.detail}</span>
          </article>
        ))}
      </div>
      <div className="chat-proof-grid">
        {chats.map((chat, index) => (
          <button className="chat-shot" data-reveal key={chat.src} onClick={() => setActiveChat(index)}>
            <img src={chat.src} alt={chat.alt} />
            <span>{chat.caption}</span>
          </button>
        ))}
      </div>
      <CtaButton variant="soft">Check If This Fits Us</CtaButton>
      {activeChat !== null && (
        <div className="chat-lightbox" role="dialog" aria-modal="true" aria-label="Chat screenshot preview">
          <button className="chat-close" aria-label="Close chat preview" onClick={() => setActiveChat(null)}>
            <X />
          </button>
          <img src={chats[activeChat].src} alt={chats[activeChat].alt} />
        </div>
      )}
    </section>
  );
}

function HappyCustomers() {
  const stats = [
    ["1-on-1", "support before starting"],
    ["Couple", "routine for both partners"],
    ["Daily", "simple steps at home"],
  ];
  return (
    <section className="section happy-customers" id="customer-reviews">
      <SectionHeader
        eyebrow="Happy Customers"
        title="More Confidence, More Clarity, More Support"
        text="Couples do not only need a bottle. They need someone to explain the path and help them stay consistent."
      />
      <div className="happy-layout">
        <img src={asset("happy-customers.jpg")} alt="Happy customers placeholder" />
        <div className="happy-copy">
          <h3>Many customers begin with fear, then feel calmer when the plan becomes clear.</h3>
          <p>
            AGO MOM + AGO DAD is presented as a couple wellness routine with consultation, realistic expectations
            and ongoing care for people who still want to keep trying with hope.
          </p>
          <div className="stats-row">
            {stats.map(([value, label]) => (
              <div key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <CtaButton variant="outline">See Why Couples Trust Us</CtaButton>
        </div>
      </div>
    </section>
  );
}

function CustomerTrustIntro() {
  const reviewVideos = [
    {
      id: "chat-positive-test-guidance",
      author: "Customer Proof",
      condition: "Positive pregnancy test",
      caption: "A real chat moment after the customer shared pregnancy progress.",
      image: asset("customer-chat-proof-01.png"),
      likes: "4.7K",
      comments: [
        ["Anna P.", "This gives me real hope."],
        ["Grace M.", "The guidance after the result matters so much."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-ultrasound-update",
      author: "Customer Proof",
      condition: "Ultrasound update",
      caption: "Customer shared ultrasound images and continued asking for guidance.",
      image: asset("customer-chat-proof-02.png"),
      likes: "3.2K",
      comments: [
        ["Sarah M.", "Seeing follow-up support like this is reassuring."],
        ["Emily R.", "This feels more trustworthy than just product ads."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-product-received-mom",
      author: "Customer Proof",
      condition: "Product received",
      caption: "A customer confirms the package arrived and asks how to take it.",
      image: asset("customer-chat-proof-03.png"),
      likes: "5.1K",
      comments: [
        ["Megan C.", "The dosage guidance makes the routine less confusing."],
        ["Olivia T.", "I like seeing real messages, not only claims."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-ago-tumor-support",
      author: "Customer Proof",
      condition: "AGO Tumor support",
      caption: "The customer continues the conversation after receiving product guidance.",
      image: asset("customer-chat-proof-04.png"),
      likes: "2.8K",
      comments: [
        ["Rachel B.", "Real conversations make the page feel more credible."],
        ["Jessica N.", "This is the kind of support customers need."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-whatsapp-dosage",
      author: "Customer Proof",
      condition: "Dosage support",
      caption: "A customer receives clear product dosage instructions after delivery.",
      image: asset("customer-chat-proof-05.png"),
      likes: "4.1K",
      comments: [
        ["Nicole A.", "Clear instructions after purchase are important."],
        ["Amanda J.", "This makes the service feel more personal."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-finally-positive",
      author: "Customer Proof",
      condition: "Finally positive",
      caption: "A customer shares a positive test and emotional follow-up message.",
      image: asset("customer-chat-proof-06.png"),
      likes: "3.9K",
      comments: [
        ["Heather K.", "This is such a hopeful message."],
        ["Lauren S.", "I can feel how emotional this moment is."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-large-order-received",
      author: "Customer Proof",
      condition: "Package received",
      caption: "Customer confirms receiving multiple products in the routine.",
      image: asset("customer-chat-proof-07.png"),
      likes: "4.4K",
      comments: [
        ["Brittany L.", "Seeing delivery proof helps a lot."],
        ["Ashley P.", "This makes the shop look more reliable."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-ovulation-test",
      author: "Customer Proof",
      condition: "Ovulation tracking",
      caption: "Customer shares products and ovulation testing during the journey.",
      image: asset("customer-chat-proof-08.png"),
      likes: "3.6K",
      comments: [
        ["Melissa D.", "The tracking part makes the plan feel practical."],
        ["Katherine W.", "This feels like real follow-up care."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-ultrasound-dark-mode",
      author: "Customer Proof",
      condition: "Pregnancy ultrasound",
      caption: "Customer shares ultrasound photos after the journey.",
      image: asset("customer-chat-proof-09.png"),
      likes: "5.8K",
      comments: [
        ["Samantha R.", "This is the proof people want to see."],
        ["Erica M.", "So happy for families who get this moment."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-package-usage",
      author: "Customer Proof",
      condition: "Product usage support",
      caption: "Customer asks how to use the package and receives a clear routine.",
      image: asset("customer-chat-proof-10.png"),
      likes: "4.9K",
      comments: [
        ["Vanessa C.", "The product support after delivery is important."],
        ["Kelly B.", "This answers a big worry before buying."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-baby-born",
      author: "Customer Proof",
      condition: "Baby update",
      caption: "A family shares baby photos after trusting the routine.",
      image: asset("customer-chat-proof-11.png"),
      likes: "6.2K",
      comments: [
        ["Rebecca H.", "This is beautiful and emotional."],
        ["Laura G.", "Stories like this build trust."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
    {
      id: "chat-excited-positive",
      author: "Customer Proof",
      condition: "Pregnancy excitement",
      caption: "A customer shares excitement after seeing a positive pregnancy test.",
      image: asset("customer-chat-proof-12.png"),
      likes: "5.4K",
      comments: [
        ["Christina F.", "This is the kind of hope customers are looking for."],
        ["Morgan L.", "Real messages make it feel human."],
        ["Seller's feedback", "Thank you for trusting and choosing our shop's product. Wishing you and your family abundant health."],
      ],
    },
  ];
  const [activeVideo, setActiveVideo] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [reelComments, setReelComments] = useState([]);
  const [dbLikeCount, setDbLikeCount] = useState(0);
  const marqueeVideos = [...reviewVideos, ...reviewVideos];
  const likeCount = activeVideo ? compactCount(parseCompactCount(activeVideo.likes) + dbLikeCount) : "";
  const commentCount = reelComments.length;

  const getCommentAvatar = (index) => {
    if (!activeVideo) return customerAvatar(index);
    const str = `${activeVideo.id}-${index}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return customerAvatar(Math.abs(hash));
  };

  useEffect(() => {
    if (!activeVideo) return;
    let cancelled = false;

    setIsMuted(true);
    setLiked(false);
    setCommentText("");
    setReelComments(activeVideo.comments);

    fetch(`/api/reel-state?videoId=${encodeURIComponent(activeVideo.id)}&clientId=${encodeURIComponent(getClientId())}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load reel state.");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const savedComments = Array.isArray(data.comments)
          ? data.comments.map((item) => [item.name, item.comment])
          : [];
        setReelComments([...savedComments, ...activeVideo.comments]);
        setDbLikeCount(Number(data.likeCount) || 0);
        setLiked(Boolean(data.liked));
      })
      .catch(() => {
        if (cancelled) return;
        setDbLikeCount(0);
        setLiked(false);
        setReelComments(activeVideo.comments);
      });

    return () => {
      cancelled = true;
    };
  }, [activeVideo]);

  const submitReelComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");

    try {
      const response = await fetch("/api/reel-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: activeVideo.id,
          name: "Customer",
          comment: text,
        }),
      });
      if (!response.ok) throw new Error("Could not save comment.");
      const data = await response.json();
      setReelComments((current) => [[data.comment.name, data.comment.comment], ...current]);
    } catch {
      setReelComments((current) => [["Customer", text], ...current]);
    }
  };

  const toggleReelLike = async () => {
    if (!activeVideo) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setDbLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      const response = await fetch("/api/reel-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: activeVideo.id,
          clientId: getClientId(),
          liked: nextLiked,
        }),
      });
      if (!response.ok) throw new Error("Could not save like.");
      const data = await response.json();
      setLiked(Boolean(data.liked));
      setDbLikeCount(Number(data.likeCount) || 0);
    } catch {
      // Keep the optimistic UI change if the database is not configured locally.
    }
  };

  return (
    <section className="section customer-trust-intro" id="reviews">
      <SectionHeader
        eyebrow="Thousands of customers trust and are satisfied"
        title="What Our Customers Say About Us"
        text="Watch short journey stories from customers who wanted clarity, support and a plan they could follow together."
      />
      <div className="review-video-rail" data-reveal>
        <div className="review-video-track">
          {marqueeVideos.map((video, index) => (
            <button
              className="review-video-card"
              key={`${video.author}-${index}`}
              onClick={() => setActiveVideo(reviewVideos[index % reviewVideos.length])}
            >
              <img src={video.image} alt={`${video.author} review video placeholder`} />
            </button>
          ))}
        </div>
      </div>
      {activeVideo && (
        <div className="reel-lightbox" role="dialog" aria-modal="true" aria-label={`${activeVideo.author} review video`}>
          <button className="reel-close" aria-label="Close video review" onClick={() => setActiveVideo(null)}>
            <X />
          </button>
          <div className="reel-shell">
            <div className="reel-video">
              <img src={activeVideo.image} alt={`${activeVideo.author} review video placeholder`} />
              <button
                className={`reel-sound ${isMuted ? "muted" : ""}`}
                aria-label={isMuted ? "Turn sound on" : "Mute sound"}
                onClick={() => setIsMuted((current) => !current)}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button className="reel-search" aria-label="Search">
                <Search size={20} />
              </button>
              <div className="reel-caption">
                <strong>{activeVideo.author} · Follow</strong>
                <p>{activeVideo.caption}</p>
              </div>
            </div>
            <div className="reel-actions" aria-label="Video reactions">
              <button className={liked ? "active" : ""} type="button" onClick={toggleReelLike}>
                <Heart fill={liked ? "currentColor" : "none"} />
                <span>{likeCount}</span>
              </button>
              <button type="button" onClick={() => document.querySelector(".reel-comment-form input")?.focus()}>
                <MessageCircle />
                <span>{commentCount}</span>
              </button>
              <button type="button">
                <Send />
                <span>203</span>
              </button>
            </div>
            <aside className="reel-comments">
              <div className="reel-author">
                <strong>{activeVideo.author}</strong>
                <span>{activeVideo.condition}</span>
                <p>{activeVideo.caption}</p>
              </div>
              <div className="reel-sort">Most relevant</div>
              {reelComments.map(([name, comment], index) => (
                <article key={`${name}-${index}`}>
                  <div className="reel-comment-avatar">
                    <img src={getCommentAvatar(index)} alt={`${name} avatar`} />
                  </div>
                  <div>
                    <strong>{name}</strong>
                    <p>{comment}</p>
                    <span>Like · Reply</span>
                  </div>
                </article>
              ))}
              <form className="reel-comment-form" onSubmit={submitReelComment}>
                <input
                  placeholder="Comment as customer"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                />
                <button type="submit" aria-label="Send comment">
                  <Send size={18} />
                </button>
              </form>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

function ReceivingProducts() {
  const items = [
    asset("product-combo-placeholder.png"),
    asset("chat-feedback-01-placeholder.png"),
    asset("receiving-success.jpg"),
  ];
  return (
    <section className="section receiving-products">
      <SectionHeader
        eyebrow="The Joy of Receiving Our Products"
        title="Every Delivery Is a Moment of Hope"
        text="For many couples, receiving the routine feels like finally having something practical to begin."
      />
      <div className="receiving-grid">
        {items.map((src, index) => (
          <article key={src} data-reveal>
            <img src={src} alt={`Product receiving placeholder ${index + 1}`} />
            <span>{["Product received", "Customer message", "Family wellness moment"][index]}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Certifications() {
  const certificates = [
    {
      name: "GMP",
      image: asset("gmp-certificate-registration.png"),
    },
    {
      name: "FDA",
      image: asset("fda-certificate-2025-new.png"),
    },
  ];
  return (
    <section className="section certifications">
      <SectionHeader
        eyebrow="International Certifications - GMP & FDA"
        title="Quality Proof Customers Can Understand"
        text="When the journey already feels emotional, product quality and documentation should feel clear."
      />
      <div className="cert-grid">
        {certificates.map((item) => (
          <article className="cert-card" data-reveal key={item.name}>
            <div className={`cert-image cert-image-${item.name.toLowerCase()}`}>
              <img src={item.image} alt={`${item.name} certificate placeholder`} />
              <span className="cert-badge">
                <BadgeCheck />
                {item.name}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HonestReviews() {
  const items = [
    ["Realistic wellness guidance, not pressure", asset("realistic-wellness-guidance-not-pressure.png")],
    ["Private support before choosing a routine", asset("private-support-before-choosing-routine.png")],
    ["Easy explanations for both partners", asset("easy-explanations-for-both-partners.png")],
    ["Follow-up care during the journey", asset("follow-up-care-during-journey.png")],
  ];
  return (
    <section className="section honest-reviews">
      <SectionHeader
        eyebrow="Honest Reviews"
        title="Clear Words From People Who Wanted a Simple Plan"
        text="Honest feedback matters because couples can recognize their own worries in other people's stories."
      />
      <div className="honest-grid">
        {items.map(([item, image], index) => (
          <article key={item} className="honest-card" data-reveal>
            <div className="honest-image-box">
              <img src={image} alt={`${item} review placeholder`} />
              <span>0{index + 1}</span>
            </div>
            <h3>{item}</h3>
            <p>"We felt heard first, then the routine became easier to understand."</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Commitments() {
  const commitments = [
    [
      "Private Consultation",
      "Your situation is handled privately and used only to guide your consultation.",
      "commitment-private-consultation.png",
    ],
    [
      "Honest Expectations",
      "We explain wellness support clearly without making unrealistic promises.",
      "commitment-honest-expectations.png",
    ],
    [
      "Couple-Focused Care",
      "Both egg health and sperm health are considered so one partner does not carry everything alone.",
      "commitment-couple-focused.png",
    ],
    [
      "Follow-Up Support",
      "We continue answering questions after you begin, so the plan feels easier to stay with.",
      "commitment-follow-up-support.png",
    ],
  ];
  return (
    <section className="section commitments dark">
      <SectionHeader
        light
        eyebrow="Our Commitments"
        title="Natural Support With Clear, Responsible Care"
        text="Our promise is simple: listen first, guide honestly and keep supporting couples after they begin."
      />
      <div className="commitment-grid">
        {commitments.map(([title, text, image]) => (
          <article key={title} className="commitment-card" data-reveal>
            <img className="commitment-icon" src={asset(image)} alt="" aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RealFeedback() {
  return (
    <section className="section real-feedback">
      <SectionHeader
        eyebrow="Real Feedback from Our Customers"
        title="One-time trust, lifelong care"
        text="Customer care should not stop after the first message. Couples need follow-up when questions appear later."
      />
      <div className="feedback-band" data-reveal>
        <div>
          <Quote />
          <p>
            "I first messaged because I was scared and confused. What made me trust the routine was the patient
            explanation and follow-up after I started."
          </p>
          <div className="feedback-author">
            <img src={customerAvatar(5)} alt="Customer avatar" />
            <span>
              <strong>Emily R.</strong>
              <em>Calgary, Canada</em>
            </span>
          </div>
        </div>
        <img src={asset("chat-feedback-02-placeholder.png")} alt="Real feedback chat placeholder" />
      </div>
    </section>
  );
}

function Support() {
  return (
    <section className="section support">
      <div className="split reverse">
        <img data-reveal src={asset("support-specialist-placeholder.png")} alt="Support specialist placeholder" />
        <div className="support-card" data-reveal>
          <MessageCircle className="bubble-icon" />
          <SectionHeader title="You Don't Have to Figure It Out Alone" />
          <ul className="check-list">
            {[
              "Review your age and trying history",
              "Understand your cycle and main concern",
              "Suggest a daily support routine",
              "Follow up during your fertility journey",
            ].map((item) => (
              <li key={item}>
                <BadgeCheck /> {item}
              </li>
            ))}
          </ul>
          <CtaButton variant="glow">Talk to Specialist</CtaButton>
        </div>
      </div>
    </section>
  );
}

function TrustProof() {
  const items = ["Product Information", "Quality-Controlled Production", "Real Customer Support", "Couple-Focused Routine"];
  return (
    <section className="section trust">
      <SectionHeader title="Trust Proof" text="Clear information, real support, and a routine built around couples." />
      <div className="card-grid four">
        {items.map((item) => (
          <article className="soft-card trust-card" data-reveal key={item}>
            <ShieldCheck />
            <h3>{item}</h3>
            <p>Tap to review details during consultation.</p>
          </article>
        ))}
      </div>
      <CtaButton variant="soft">Ask for Details</CtaButton>
    </section>
  );
}

function FAQ() {
  const faqs = [
    ["Is this a medicine?", "AGO MOM + AGO DAD is introduced as a 100% natural herbal wellness product."],
    ["Why focus on both partners?", "Because many couples feel stuck when only one side is supported. Egg health and sperm health both matter."],
    ["Can I ask questions before starting?", "Yes. The free consultation is for sharing your situation and choosing a routine that feels realistic."],
    ["What if I feel overwhelmed?", "That is exactly why the consultation exists. We help you start with one clear step, not a complicated plan."],
    ["Can I use this while preparing for IVF?", "Please consult your healthcare provider if you are under medical treatment or preparing for IVF."],
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq" id="faq">
      <SectionHeader title="Common Questions Before You Start" />
      <div className="faq-list">
        {faqs.map(([q, a], index) => (
          <article className={`faq-item ${open === index ? "open" : ""}`} key={q}>
            <button onClick={() => setOpen(open === index ? -1 : index)}>
              <span>{q}</span>
              {open === index ? <Minus /> : <Plus />}
            </button>
            <p>{a}</p>
          </article>
        ))}
      </div>
      <CtaButton variant="outline">Ask Before I Start</CtaButton>
    </section>
  );
}

function Offer() {
  return (
    <section className="section offer dark">
      <SectionHeader light title="Start With One Clear Step Today" />
      <div className="offer-box" data-reveal>
        <img src={asset("start-with-one-clear-step-today.png")} alt="Start with one clear consultation step today" />
        <div>
          <ul className="check-list">
            {[
              "Free 1-on-1 consultation before choosing",
              "Guidance for both partners, not only one side",
              "Daily wellness support for egg health and sperm health",
              "Special couple routine support available today",
            ].map((item) => (
              <li key={item}>
                <BadgeCheck /> {item}
              </li>
            ))}
          </ul>
          <CtaButton>Claim My Free Consultation</CtaButton>
        </div>
      </div>
    </section>
  );
}

function ConsultationForm() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="section consultation" id="consultation">
      <div className="form-shell" data-reveal>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fields = collectFormFields(e.currentTarget);
            setSubmitted(true);
            try {
              await submitLead("Free Fertility Consultation", fields);
            } catch {
              // Keep the thank-you state even when Telegram is not configured locally.
            }
          }}
        >
          <SectionHeader title="Get Your Free Couple Fertility Consultation" />
          <ConsultationFields />
          <p className="privacy">Your information is private and used only to prepare your consultation.</p>
          {submitted && <p className="thanks">Thank you. We received your request and will guide you through the next step.</p>}
        </form>
        <div className="form-image-panel" aria-hidden="true">
          <img src={asset("get-your-free-couple-fertility-consultation.png")} alt="" />
        </div>
      </div>
    </section>
  );
}

function OfferPopup({ open, autoDisabled, onOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "10",
    minutes: "26",
    seconds: "32",
  });

  useEffect(() => {
    const onScroll = () => {
      if (autoDisabled || autoShown || open) return;
      const pageHeight = document.documentElement.scrollHeight;
      if (pageHeight <= window.innerHeight) return;
      const progress = (window.scrollY + window.innerHeight) / pageHeight;
      if (progress >= 0.5) {
        setAutoShown(true);
        onOpen();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", onScroll);
    };
  }, [autoDisabled, autoShown, onOpen, open]);

  useEffect(() => {
    if (!open) return undefined;
    let total = 10 * 60 * 60 + 26 * 60 + 32;
    const id = window.setInterval(() => {
      total = Math.max(0, total - 1);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      setTimeLeft({
        days: "00",
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="offer-popup-backdrop" role="dialog" aria-modal="true" aria-label="Special deal consultation popup">
      <div className="offer-popup">
        <button
          className="offer-popup-close"
          aria-label="Close popup"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <X />
        </button>
        <div className="offer-popup-visual">
          <span className="offer-ribbon">Reveal</span>
          <p className="offer-kicker">A couple wellness support routine</p>
          <h2>AGO MOM + AGO DAD</h2>
          <div className="offer-price">
            <span>Original consultation: Free</span>
            <strong>Special support today</strong>
          </div>
          <p className="offer-copy">Today's offer. Start with 1-on-1 guidance for both partners.</p>
          <h3>START WITH HOPE TODAY</h3>
          <div className="offer-products-duo">
            <img src={asset("ago-mom.png")} alt="AGO MOM product" className="offer-duo-mom" />
            <img src={asset("ago-dad.png")} alt="AGO DAD product" className="offer-duo-dad" />
          </div>
        </div>
        <div className="offer-popup-form-panel">
          <h2>Get Your Free Consultation</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fields = collectFormFields(e.currentTarget);
              setSubmitted(true);
              try {
                await submitLead("Special Deal Popup", fields);
              } catch {
                // Keep frontend confirmation when Telegram is not configured locally.
              }
            }}
          >
            <input required name="popup-name" placeholder="Full name" />
            <PhoneField label="Phone / WhatsApp" name="popup-phone" compact showLabel={false} />
            <AddressField name="popup-address" showLabel={false} />
            <button type="submit">Get my consultation plan</button>
          </form>
          {submitted && <p className="thanks">Thank you. We will contact you and help you choose the next step.</p>}
          <p className="offer-count-label">Offer ends after:</p>
          <div className="offer-countdown" aria-label="Offer countdown">
            {[
              ["Day", timeLeft.days],
              ["Hour", timeLeft.hours],
              ["Minute", timeLeft.minutes],
              ["Second", timeLeft.seconds],
            ].map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="section final-cta">
      <div data-reveal>
        <img src={asset("your-fertility-journey-deserves-support-from-both-sides.jpg")} alt="Your fertility journey deserves support from both sides" />
        <h2>Your Fertility Journey Deserves Support From Both Sides</h2>
        <p>
          You do not have to keep guessing alone. Start with one private consultation, understand your routine
          and keep moving forward with more hope.
        </p>
        <CtaButton variant="glow">Start My Consultation</CtaButton>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <h2>AGO MOM + AGO DAD</h2>
        <p>Couple fertility wellness support with guidance, clarity and care.</p>
        <p>
          Hotline: <a href={telHref}>{hotlineNumber}</a> · WhatsApp: <a href={whatsappHref}>{hotlineNumber}</a>
        </p>
      </div>
      <nav>
        <a href="#products">Products</a>
        <a href="#faq">FAQ</a>
        <a href="#consultation">Consultation</a>
        <a href="#top">Back to top</a>
      </nav>
    </footer>
  );
}

function ScrollProgressGuide() {
  const [state, setState] = useState({
    progress: 0,
    current: scrollSections[0],
    next: scrollSections[1],
  });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      const marker = scrollTop + Math.min(window.innerHeight * 0.38, 320);
      const positions = scrollSections
        .map((item) => {
          const element = item.id === "top" ? document.body : document.getElementById(item.id);
          return element ? { ...item, top: element.offsetTop } : null;
        })
        .filter(Boolean);
      const currentIndex = positions.reduce((active, item, index) => (item.top <= marker ? index : active), 0);
      setState({
        progress,
        current: positions[currentIndex] || scrollSections[0],
        next: positions[currentIndex + 1] || null,
      });
    };

    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="scroll-guide" aria-label="Page scroll progress">
      <div className="scroll-progress">
        <span style={{ width: `${state.progress}%` }} />
      </div>
    </div>
  );
}

function LandingPage() {
  useReveal();
  const [offerPopupOpen, setOfferPopupOpen] = useState(false);
  const [offerPopupDismissed, setOfferPopupDismissed] = useState(false);
  const [hideStickyCta, setHideStickyCta] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("#top");

  // Scroll Depth and Popup Analytics Tracking
  useEffect(() => {
    const fired = new Set();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const percentage = Math.round((window.scrollY / scrollHeight) * 100);
      const checkpoints = [20, 50, 80, 100];
      
      for (const checkpoint of checkpoints) {
        if (percentage >= checkpoint && !fired.has(checkpoint)) {
          fired.add(checkpoint);
          trackInteraction(`scroll_${checkpoint}`);
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (offerPopupOpen) {
      trackInteraction("popup_open");
    }
  }, [offerPopupOpen]);

  useEffect(() => {
    const hasRef = new URLSearchParams(window.location.search).has("ref") || Boolean(window.localStorage.getItem("affiliate_ref"));
    if (!hasRef) return undefined;
    const key = `ago-tracking-fired:${window.location.pathname}${window.location.search}`;
    if (window.sessionStorage.getItem(key)) return undefined;
    window.sessionStorage.setItem(key, "1");
    trackClickIfNeeded().catch(() => {});
    return undefined;
  }, []);

  const navLinks = [
    ["Home", "#top"],
    ["Products", "#products"],
    ["Introduction", "#introduction"],
    ["Benefits", "#benefits"],
    ["Reviews", "#reviews"],
    ["Contact", "#consultation"],
  ];

  const handleNavClick = (href) => (e) => {
    setMobileMenuOpen(false);
    if (href === "#consultation") {
      e.preventDefault();
      setOfferPopupOpen(true);
    }
  };

  useEffect(() => {
    const formSection = document.getElementById("consultation");
    if (!formSection) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHideStickyCta(entry.isIntersecting);
      },
      { threshold: 0.08 }
    );
    observer.observe(formSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const navTargets = navLinks
      .filter(([, href]) => href !== "#consultation")
      .map(([, href]) => href);
    let frame = 0;

    const updateActiveNav = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.34, 300);
      const activeHref = navTargets.reduce((active, href) => {
        const element = href === "#top" ? document.body : document.getElementById(href.slice(1));
        return element && element.offsetTop <= marker ? href : active;
      }, "#top");
      const consultation = document.getElementById("consultation");
      if (consultation && consultation.offsetTop <= marker) {
        setActiveNav("#consultation");
        return;
      }
      setActiveNav(activeHref);
    };

    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveNav);
    };

    updateActiveNav();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <header className="site-nav">
        <a href="#top" className="brand">
          <Leaf /> AGO
        </a>
        <nav>
          {navLinks.map(([label, href]) => (
            <a href={href} className={activeNav === href ? "is-active" : ""} onClick={handleNavClick(href)} key={label}>
              {label}
            </a>
          ))}
        </nav>
        <a href={whatsappHref} className="nav-phone" aria-label={`Chat on WhatsApp at ${hotlineNumber}`}>
          <span className="whatsapp-orb">
            <WhatsAppIcon width="20" height="20" />
          </span>
          <span>{hotlineNumber}</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu />
        </button>
      </header>
      <div
        className={`mobile-menu-backdrop${mobileMenuOpen ? " is-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />
      <aside className={`mobile-menu${mobileMenuOpen ? " is-open" : ""}`} aria-hidden={!mobileMenuOpen}>
        <div className="mobile-menu-head">
          <a href="#top" className="brand" onClick={() => setMobileMenuOpen(false)}>
            <Leaf /> AGO
          </a>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {navLinks.map(([label, href]) => (
            <a href={href} className={activeNav === href ? "is-active" : ""} onClick={handleNavClick(href)} key={label}>
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <ScrollProgressGuide />
      <main>
        <Hero />
        <FertilityIssues />
        <FibroidComplications />
        <InfertilityCauses />
        <PainPoints />
        <ProductReveal />
        <BenefitGrid />
        <BeforeAfter />
        <ProductCatalog />
        <AuthoritySections />
        <Certifications />
        <CustomerTrustIntro />
        <HappyCustomers />
        <Stories />
        <RealFeedback />
        <HonestReviews />
        <ReceivingProducts />
        <Commitments />
        <Comparison />
        <FAQ />
        <Offer />
        <ConsultationForm />
        <FinalCTA />
      </main>
      <Footer />
      <a className={`sticky-mobile-cta${hideStickyCta ? " is-hidden" : ""}`} href="#consultation">
        Get Free Consultation
      </a>
      <OfferPopup
        open={offerPopupOpen}
        autoDisabled={offerPopupDismissed}
        onOpen={() => setOfferPopupOpen(true)}
        onClose={() => {
          setOfferPopupOpen(false);
          setOfferPopupDismissed(true);
          trackInteraction("popup_close");
        }}
      />
      <SharedDatalists />
    </>
  );
}

// ----------------- Auth Components -----------------
function Login({ navigate, type, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      onLogin(data.user);
      navigate(type === "admin" ? "/admin/dashboard" : "/sale/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Leaf />
          <h2>AGO MOM + AGO DAD</h2>
          <p>{type === "admin" ? "Admin Portal" : "Sale Representative Portal"}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-alert error">{error}</div>}
          <div className="auth-field">
            <label>Email or Phone</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@gmail.com"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. adminpassword"
              required
            />
          </div>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------- Shared UI Components -----------------
function DateFilter({ value, onChange }) {
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const handleSelect = (e) => {
    const type = e.target.value;
    if (type !== "custom") {
      onChange({ type, startDate: "", endDate: "" });
    } else {
      onChange({ type, startDate: customDates.start, endDate: customDates.end });
    }
  };

  const handleCustomDateChange = (field, val) => {
    const nextDates = { ...customDates, [field]: val };
    setCustomDates(nextDates);
    if (nextDates.start && nextDates.end) {
      onChange({ type: "custom", startDate: nextDates.start, endDate: nextDates.end });
    }
  };

  return (
    <div className="date-filter-group">
      <div className="select-wrapper">
        <select value={value.type} onChange={handleSelect}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      {value.type === "custom" && (
        <div className="custom-dates">
          <input
            type="date"
            value={customDates.start}
            onChange={(e) => handleCustomDateChange("start", e.target.value)}
            aria-label="Start Date"
          />
          <span>to</span>
          <input
            type="date"
            value={customDates.end}
            onChange={(e) => handleCustomDateChange("end", e.target.value)}
            aria-label="End Date"
          />
        </div>
      )}
    </div>
  );
}

const exportCSV = (data, filename, headers) => {
  const csvRows = [headers.join(",")];
  data.forEach(row => {
    const values = headers.map(header => {
      const cellValue = row[header] ?? "";
      const escaped = String(cellValue).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function formatRange(filter) {
  let end = new Date();
  end.setHours(23, 59, 59, 999);
  let start = new Date();
  start.setHours(0, 0, 0, 0);

  if (filter.type === "all") return { start: "", end: "" };
  if (filter.type === "today") {
    // already set
  } else if (filter.type === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (filter.type === "7days") {
    start.setDate(start.getDate() - 7);
  } else if (filter.type === "30days") {
    start.setDate(start.getDate() - 30);
  } else if (filter.type === "month") {
    start = new Date(start.getFullYear(), start.getMonth(), 1);
  } else if (filter.type === "custom") {
    if (filter.startDate && filter.endDate) {
      start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      return { start: "", end: "" };
    }
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

// ----------------- Admin Sub-Pages -----------------

function AdminDashboard({ filter }) {
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { start, end } = formatRange(filter);
    const query = new URLSearchParams();
    if (start) query.append("startDate", start);
    if (end) query.append("endDate", end);

    Promise.all([
      fetch(`/api/admin/dashboard?${query}`).then(r => r.json()),
      fetch("/api/admin/sales").then(r => r.json())
    ])
      .then(([dashData, salesData]) => {
        if (dashData.ok) setStats(dashData.stats);
        if (salesData.ok) setSales(salesData.sales);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleExport = () => {
    if (!sales.length) return;
    const headers = ["sale_name", "sale_code", "total_clicks", "unique_visitors", "total_leads", "conversion_rate", "status"];
    exportCSV(sales, `sales_stats_${new Date().toISOString().slice(0,10)}.csv`, headers);
  };

  if (loading || !stats) return <div className="dash-loader">Gathering statistics...</div>;

  return (
    <div className="dash-view">
      <div className="dash-actions-row">
        <h3>System Metrics</h3>
        <button className="dash-action-btn export-btn" type="button" onClick={handleExport}>
          <span>Export Sales Stats</span>
        </button>
      </div>

      <div className="dash-metrics-grid">
        <div className="metric-card">
          <h4>Total Leads Registered</h4>
          <span className="metric-value">{stats.totalLeads}</span>
          <p className="metric-desc">Conversion Rate: {stats.conversionRate}%</p>
        </div>
        <div className="metric-card">
          <h4>Total Links Clicked</h4>
          <span className="metric-value">{stats.totalClicks}</span>
          <p className="metric-desc">Unique Visitors: {stats.uniqueVisitors}</p>
        </div>
        <div className="metric-card">
          <h4>Registered Sales Agents</h4>
          <span className="metric-value">{stats.totalSales}</span>
          <p className="metric-desc">{stats.activeSales} currently active</p>
        </div>
        <div className="metric-card">
          <h4>Active Tracking Links</h4>
          <span className="metric-value">{stats.activeLinks}</span>
          <p className="metric-desc">Out of {stats.totalLinks} links total</p>
        </div>
        <div className="metric-card spotlight">
          <h4>Top Agent (Clicks)</h4>
          <span className="metric-value text-medium">{stats.topSaleByClicks.name}</span>
          <p className="metric-desc">{stats.topSaleByClicks.count} clicks recorded</p>
        </div>
        <div className="metric-card spotlight">
          <h4>Top Agent (Leads)</h4>
          <span className="metric-value text-medium">{stats.topSaleByLeads.name}</span>
          <p className="metric-desc">{stats.topSaleByLeads.count} leads converted</p>
        </div>
      </div>

      <div className="dash-table-card">
        <h3>Performance Breakdown</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Sale ID</th>
                <th>Clicks</th>
                <th>Unique Visitors</th>
                <th>Leads</th>
                <th>Conv. Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.sale_name}</strong></td>
                  <td><code>{s.sale_code}</code></td>
                  <td>{s.total_clicks}</td>
                  <td>{s.unique_visitors}</td>
                  <td>{s.total_leads}</td>
                  <td><strong>{s.conversion_rate}%</strong></td>
                  <td>
                    <span className={`status-pill ${s.status}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!sales.length && (
                <tr>
                  <td colSpan="7" className="text-center">No sale agents found. Create one under Sales tab.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Behavior Analytics */}
      <div className="dash-table-card" style={{ marginTop: "24px" }}>
        <h3>User Behavior & Scroll Analytics</h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
          Measure client interaction levels, scroll depth checkpoints, and popup form engagement.
        </p>
        <div className="dash-metrics-grid" style={{ marginBottom: "20px" }}>
          <div className="metric-card">
            <h4>Scroll 20% (Main Hero)</h4>
            <span className="metric-value">{stats.interactions?.scroll_20?.unique || 0}</span>
            <p className="metric-desc">Total Views: {stats.interactions?.scroll_20?.total || 0}</p>
          </div>
          <div className="metric-card">
            <h4>Scroll 50% (Product Range)</h4>
            <span className="metric-value">{stats.interactions?.scroll_50?.unique || 0}</span>
            <p className="metric-desc">Total Views: {stats.interactions?.scroll_50?.total || 0}</p>
          </div>
          <div className="metric-card">
            <h4>Scroll 80% (Reviews/FAQ)</h4>
            <span className="metric-value">{stats.interactions?.scroll_80?.unique || 0}</span>
            <p className="metric-desc">Total Views: {stats.interactions?.scroll_80?.total || 0}</p>
          </div>
          <div className="metric-card">
            <h4>Scroll 100% (Bottom Form)</h4>
            <span className="metric-value">{stats.interactions?.scroll_100?.unique || 0}</span>
            <p className="metric-desc">Total Views: {stats.interactions?.scroll_100?.total || 0}</p>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Interaction Event Type</th>
                <th>Unique Visitors</th>
                <th>Total Interactions</th>
                <th>Engagement Rate %</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "scroll_20", label: "Browsed to 20% (Hero / Introduction)" },
                { key: "scroll_50", label: "Browsed to 50% (Product Detail / Catalog)" },
                { key: "scroll_80", label: "Browsed to 80% (Customer Testimonials)" },
                { key: "scroll_100", label: "Browsed to 100% (Footer / Bottom Form)" },
                { key: "popup_open", label: "Special Offer Popup Shown" },
                { key: "popup_close", label: "Special Offer Popup Closed" },
                { key: "popup_focus", label: "Started filling Popup Form (Focused)" },
                { key: "form_focus", label: "Started filling Bottom Form (Focused)" },
              ].map(event => {
                const eventStats = stats.interactions?.[event.key] || { unique: 0, total: 0 };
                const uniqueClicks = stats.uniqueVisitors || 1;
                const rate = ((eventStats.unique / uniqueClicks) * 100).toFixed(1);
                return (
                  <tr key={event.key}>
                    <td><strong>{event.label}</strong></td>
                    <td>{eventStats.unique}</td>
                    <td>{eventStats.total}</td>
                    <td><strong>{rate}%</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", saleCode: "", password: "", note: "" });
  const [activeTab, setActiveTab] = useState("list"); // list, detail
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);

  const fetchSales = () => {
    setLoading(true);
    fetch("/api/admin/sales")
      .then(r => r.json())
      .then(data => {
        if (data.ok) setSales(data.sales);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const openCreateModal = () => {
    setEditSale(null);
    setFormData({ name: "", email: "", phone: "", saleCode: "", password: "", note: "" });
    setShowModal(true);
  };

  const openEditModal = (s) => {
    setEditSale(s);
    setFormData({ name: s.sale_name, email: s.email, phone: s.phone || "", saleCode: s.sale_code, password: "", note: s.note || "" });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = editSale ? `/api/admin/sales?id=${editSale.id}` : "/api/admin/sales";
    const method = editSale ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      fetchSales();
      if (selectedSaleDetails && selectedSaleDetails.id === editSale?.id) {
        viewSaleDetail(editSale.id);
      }
    } else {
      alert(data.error || "Action failed.");
    }
  };

  const handleToggleStatus = async (s) => {
    const nextStatus = s.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/sales?id=${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      fetchSales();
      if (selectedSaleDetails && selectedSaleDetails.id === s.id) {
        viewSaleDetail(s.id);
      }
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Are you sure you want to delete ${s.sale_name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/sales?id=${s.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchSales();
      if (selectedSaleDetails && selectedSaleDetails.id === s.id) {
        setActiveTab("list");
        setSelectedSaleDetails(null);
      }
    }
  };

  const viewSaleDetail = async (id) => {
    setLoading(true);
    const res = await fetch(`/api/admin/sales?id=${id}`);
    const data = await res.json();
    if (res.ok) {
      setSelectedSaleDetails(data.sale);
      setActiveTab("detail");
    }
    setLoading(false);
  };

  if (loading && sales.length === 0) return <div className="dash-loader">Loading Sales Agents...</div>;

  return (
    <div className="sales-view">
      <div className="sales-tabs-header">
        <button 
          className={`tab-link ${activeTab === "list" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("list");
            setSelectedSaleDetails(null);
          }}
        >
          All Agents
        </button>
        {selectedSaleDetails && (
          <button className={`tab-link ${activeTab === "detail" ? "active" : ""}`} onClick={() => setActiveTab("detail")}>
            Agent Detail: {selectedSaleDetails.sale_name}
          </button>
        )}
        <button className="tab-action-btn" onClick={openCreateModal}>
          + Create Agent
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="dash-table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Sale ID</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Total Leads</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td>
                      <button className="link-btn" onClick={() => viewSaleDetail(s.id)}>
                        <strong>{s.sale_name}</strong>
                      </button>
                    </td>
                    <td><code>{s.sale_code}</code></td>
                    <td>{s.email}</td>
                    <td>{s.phone || "N/A"}</td>
                    <td>{s.total_leads}</td>
                    <td>
                      <span className={`status-pill ${s.status}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-icon-btn edit" onClick={() => openEditModal(s)} title="Edit Agent">✎</button>
                        <button 
                          className={`action-icon-btn ${s.status === "active" ? "lock" : "unlock"}`} 
                          onClick={() => handleToggleStatus(s)} 
                          title={s.status === "active" ? "Suspend Agent" : "Activate Agent"}
                        >
                          {s.status === "active" ? "🔒" : "🔓"}
                        </button>
                        <button className="action-icon-btn delete" onClick={() => handleDelete(s)} title="Delete Agent">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        selectedSaleDetails && (
          <div className="agent-detail-layout">
            <div className="detail-cards-grid">
              <div className="detail-card info-card">
                <h3>Agent Information</h3>
                <dl className="info-list">
                  <dt>Full Name</dt>
                  <dd>{selectedSaleDetails.sale_name}</dd>
                  <dt>Sale ID / Code</dt>
                  <dd><code>{selectedSaleDetails.sale_code}</code></dd>
                  <dt>Email Address</dt>
                  <dd>{selectedSaleDetails.email}</dd>
                  <dt>Phone Number</dt>
                  <dd>{selectedSaleDetails.phone || "N/A"}</dd>
                  <dt>Account Status</dt>
                  <dd>
                    <span className={`status-pill ${selectedSaleDetails.status}`}>
                      {selectedSaleDetails.status}
                    </span>
                  </dd>
                  <dt>Registered Date</dt>
                  <dd>{new Date(selectedSaleDetails.created_at).toLocaleString()}</dd>
                  <dt>Internal Notes</dt>
                  <dd className="note-box">{selectedSaleDetails.note || "No notes."}</dd>
                </dl>
                <div className="card-actions">
                  <button className="btn btn-secondary" onClick={() => openEditModal(selectedSaleDetails)}>Edit Info</button>
                  <button 
                    className={`btn ${selectedSaleDetails.status === "active" ? "btn-warning" : "btn-primary"}`} 
                    onClick={() => handleToggleStatus(selectedSaleDetails)}
                  >
                    {selectedSaleDetails.status === "active" ? "Suspend Agent" : "Activate Agent"}
                  </button>
                </div>
              </div>

              <div className="detail-card stats-card">
                <h3>Affiliate Performance Summary</h3>
                <div className="metric-blocks">
                  <div className="metric-box">
                    <span>{selectedSaleDetails.total_clicks}</span>
                    <label>Total Clicks</label>
                  </div>
                  <div className="metric-box">
                    <span>{selectedSaleDetails.unique_visitors}</span>
                    <label>Unique Visitors</label>
                  </div>
                  <div className="metric-box">
                    <span>{selectedSaleDetails.total_leads}</span>
                    <label>Converted Leads</label>
                  </div>
                  <div className="metric-box">
                    <span>{selectedSaleDetails.conversion_rate}%</span>
                    <label>Form Conversion Rate</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-table-card leads-card">
              <h3>Customers Converted ({selectedSaleDetails.leads.length})</h3>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Message</th>
                      <th>Created Date</th>
                      <th>Referral Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSaleDetails.leads.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.customer_name}</strong></td>
                        <td>{l.customer_phone}</td>
                        <td>{l.customer_email || "N/A"}</td>
                        <td><p className="table-cell-text">{l.message || "N/A"}</p></td>
                        <td>{new Date(l.created_at).toLocaleString()}</td>
                        <td><code>{l.ref_code}</code></td>
                      </tr>
                    ))}
                    {!selectedSaleDetails.leads.length && (
                      <tr>
                        <td colSpan="6" className="text-center">No leads registered under this sale yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editSale ? "Edit Agent Profile" : "Register New Sale Agent"}</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter agent name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sale ID / Code * (Unique referral code)</label>
                  <input
                    type="text"
                    value={formData.saleCode}
                    onChange={(e) => setFormData({ ...formData, saleCode: e.target.value })}
                    placeholder="e.g. sale001"
                    disabled={Boolean(editSale)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address * (For Login)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. agent@gmail.com"
                    disabled={Boolean(editSale)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    disabled={Boolean(editSale)}
                  />
                </div>
                <div className="form-group full-width">
                  <label>{editSale ? "New Password (Leave blank to keep current password)" : "Login Password *"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    required={!editSale}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Internal Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Enter note details..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editSale ? "Save Changes" : "Create Agent"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLinks() {
  const [links, setLinks] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ saleId: "", refCode: "", note: "" });

  const fetchLinks = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/tracking-links").then(r => r.json()),
      fetch("/api/admin/sales").then(r => r.json())
    ])
      .then(([linkData, salesData]) => {
        if (linkData.ok) setLinks(linkData.links);
        if (salesData.ok) setSales(salesData.sales);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const openCreateModal = () => {
    setFormData({ saleId: "", refCode: "", note: "" });
    setShowModal(true);
  };

  const handleSaleSelect = (e) => {
    const sId = e.target.value;
    const s = sales.find(x => x.id === Number(sId));
    setFormData({
      ...formData,
      saleId: sId,
      refCode: s ? `${s.sale_code}_link` : ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/admin/tracking-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      fetchLinks();
    } else {
      alert(data.error || "Action failed.");
    }
  };

  const handleToggleStatus = async (link) => {
    const nextStatus = link.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/tracking-links?id=${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) fetchLinks();
  };

  const handleDelete = async (link) => {
    if (!confirm(`Are you sure you want to delete link ref: ${link.ref_code}?`)) return;
    const res = await fetch(`/api/admin/tracking-links?id=${link.id}`, { method: "DELETE" });
    if (res.ok) fetchLinks();
  };

  const copyLinkToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied referral link to clipboard!");
  };

  if (loading && links.length === 0) return <div className="dash-loader">Loading Tracking Links...</div>;

  return (
    <div className="links-view">
      <div className="view-header">
        <h3>Referral & Tracking Links</h3>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Tracking Link
        </button>
      </div>

      <div className="dash-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Agent Owner</th>
                <th>Ref Code</th>
                <th>Referral URL</th>
                <th>Clicks</th>
                <th>Leads</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.sale_name}</strong></td>
                  <td><code>{l.ref_code}</code></td>
                  <td>
                    <div className="link-copy-cell">
                      <span className="clipped-url">{l.tracking_url}</span>
                      <button className="copy-badge" onClick={() => copyLinkToClipboard(l.tracking_url)}>Copy</button>
                    </div>
                  </td>
                  <td>{l.total_clicks}</td>
                  <td>{l.total_leads}</td>
                  <td>
                    <span className={`status-pill ${l.status}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button 
                        className={`action-icon-btn ${l.status === "active" ? "lock" : "unlock"}`} 
                        onClick={() => handleToggleStatus(l)} 
                        title={l.status === "active" ? "Deactivate Link" : "Activate Link"}
                      >
                        {l.status === "active" ? "🔒" : "🔓"}
                      </button>
                      <button className="action-icon-btn delete" onClick={() => handleDelete(l)} title="Delete Link">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Custom Tracking Link</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Assign to Agent *</label>
                  <select value={formData.saleId} onChange={handleSaleSelect} required>
                    <option value="">-- Choose Agent --</option>
                    {sales.map(s => (
                      <option key={s.id} value={s.id}>{s.sale_name} (Code: {s.sale_code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Custom Ref Code (Referral Query Parameter) *</label>
                  <input
                    type="text"
                    value={formData.refCode}
                    onChange={(e) => setFormData({ ...formData, refCode: e.target.value })}
                    placeholder="e.g. sale001_fb"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Link Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="e.g. Facebook Campaign link..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saleFilter, setSaleFilter] = useState("all");

  const fetchLeads = () => {
    setLoading(true);
    fetch("/api/admin/leads")
      .then(r => r.json())
      .then(data => {
        if (data.ok) setLeads(data.leads);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleExport = () => {
    if (!leads.length) return;
    const headers = ["customer_name", "customer_phone", "customer_email", "message", "sale_name", "ref_code", "created_at"];
    exportCSV(leads, `master_leads_${new Date().toISOString().slice(0,10)}.csv`, headers);
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      l.customer_phone.includes(search) ||
      (l.customer_email || "").toLowerCase().includes(search.toLowerCase());

    const matchesSale = saleFilter === "all" || 
      (saleFilter === "organic" && l.ref_code === "organic") || 
      (saleFilter === "attributed" && l.ref_code !== "organic");

    return matchesSearch && matchesSale;
  });

  if (loading && leads.length === 0) return <div className="dash-loader">Loading Master Lead List...</div>;

  return (
    <div className="leads-view">
      <div className="view-header">
        <h3>Master Lead List ({filteredLeads.length})</h3>
        <button className="btn btn-primary" onClick={handleExport}>
          Export CSV List
        </button>
      </div>

      <div className="filter-controls-row">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="select-wrapper">
          <select value={saleFilter} onChange={(e) => setSaleFilter(e.target.value)}>
            <option value="all">All Referrals</option>
            <option value="organic">Organic / Direct (No Ref)</option>
            <option value="attributed">Attributed (Sale Ref)</option>
          </select>
        </div>
      </div>

      <div className="dash-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Consultation Request</th>
                <th>Referral Source</th>
                <th>Ref Code</th>
                <th>Date Received</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.customer_name}</strong></td>
                  <td>{l.customer_phone}</td>
                  <td>{l.customer_email || "N/A"}</td>
                  <td><p className="table-cell-text">{l.message || "N/A"}</p></td>
                  <td>
                    <span className={`attribution-tag ${l.ref_code === "organic" ? "organic" : "attributed"}`}>
                      {l.sale_name}
                    </span>
                  </td>
                  <td><code>{l.ref_code}</code></td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!filteredLeads.length && (
                <tr>
                  <td colSpan="7" className="text-center">No matching leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------- Layout Components -----------------

function AdminLayout({ currentPath, navigate, user, onLogout }) {
  const [dateFilter, setDateFilter] = useState({ type: "all", startDate: "", endDate: "" });

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      onLogout();
      navigate("/admin/login");
    }
  };

  const menuItems = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Sales Agents", path: "/admin/sales" },
    { label: "Tracking Links", path: "/admin/tracking-links" },
    { label: "Leads List", path: "/admin/leads" },
  ];

  return (
    <div className="dash-container">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-head">
          <Leaf />
          <h2>AGO Admin</h2>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.path}
              type="button"
              className={`nav-item ${currentPath === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="nav-item logout-item" onClick={handleLogout}>
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dash-content-wrapper">
        <header className="dash-header">
          <div className="header-title">
            <h2>{menuItems.find(item => item.path === currentPath)?.label || "Administration"}</h2>
            <p>Welcome back, <strong>{user.name}</strong></p>
          </div>
          {currentPath === "/admin/dashboard" && (
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          )}
        </header>

        <section className="dash-body">
          {currentPath === "/admin/dashboard" && <AdminDashboard filter={dateFilter} />}
          {currentPath === "/admin/sales" && <AdminSales />}
          {currentPath === "/admin/tracking-links" && <AdminLinks />}
          {currentPath === "/admin/leads" && <AdminLeads />}
        </section>
      </main>
    </div>
  );
}

function SaleLayout({ navigate, user, onLogout }) {
  const [dateFilter, setDateFilter] = useState({ type: "all", startDate: "", endDate: "" });
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    const { start, end } = formatRange(dateFilter);
    const query = new URLSearchParams();
    if (start) query.append("startDate", start);
    if (end) query.append("endDate", end);

    fetch(`/api/sale/dashboard?${query}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStats(data.stats);
          setLeads(data.leads);
          setTrackingUrl(data.trackingUrl);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      onLogout();
      navigate("/sale/login");
    }
  };

  const copyUrl = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    alert("Copied your affiliate link!");
  };

  return (
    <div className="dash-container sale-mode">
      <aside className="dash-sidebar">
        <div className="sidebar-head">
          <Leaf />
          <h2>AGO Sale</h2>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className="nav-item active">Dashboard</button>
          <button type="button" className="nav-item logout-item" onClick={handleLogout}>Sign Out</button>
        </nav>
      </aside>

      <main className="dash-content-wrapper">
        <header className="dash-header">
          <div className="header-title">
            <h2>Personal Dashboard</h2>
            <p>Sales Agent: <strong>{user.name}</strong></p>
          </div>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </header>

        <section className="dash-body">
          {loading || !stats ? (
            <div className="dash-loader">Gathering statistics...</div>
          ) : (
            <div className="dash-view">
              {/* Affiliate link box */}
              <div className="affiliate-url-box">
                <div>
                  <h4>Your Referral & Tracking URL</h4>
                  <p className="url-display">{trackingUrl}</p>
                </div>
                <button type="button" className="btn btn-primary copy-btn" onClick={copyUrl}>
                  Copy Referral Link
                </button>
              </div>

              {/* Stats Cards */}
              <div className="dash-metrics-grid sale-metrics">
                <div className="metric-card">
                  <h4>Total Link Clicks</h4>
                  <span className="metric-value">{stats.totalClicks}</span>
                  <p className="metric-desc">Total page views via link</p>
                </div>
                <div className="metric-card">
                  <h4>Unique Visitors</h4>
                  <span className="metric-value">{stats.uniqueVisitors}</span>
                  <p className="metric-desc">Individual potential clients</p>
                </div>
                <div className="metric-card">
                  <h4>Submitted Leads</h4>
                  <span className="metric-value">{stats.totalLeads}</span>
                  <p className="metric-desc">Clients who filled consultation form</p>
                </div>
                <div className="metric-card">
                  <h4>Conversion Rate</h4>
                  <span className="metric-value">{stats.conversionRate}%</span>
                  <p className="metric-desc">Percentage of leads per click</p>
                </div>
              </div>

              {/* Table of Leads */}
              <div className="dash-table-card">
                <h3>My Converted Clients ({leads.length})</h3>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Consultation Request Note</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(l => (
                        <tr key={l.id}>
                          <td><strong>{l.customer_name}</strong></td>
                          <td>{l.customer_phone}</td>
                          <td>{l.customer_email || "N/A"}</td>
                          <td><p className="table-cell-text">{l.message || "N/A"}</p></td>
                          <td>{new Date(l.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {!leads.length && (
                        <tr>
                          <td colSpan="5" className="text-center">No customer leads recorded yet. Share your referral link to get started!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ----------------- Root App Router -----------------
function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPath) => {
    window.history.pushState(null, "", newPath);
    setCurrentPath(newPath);
  };

  useEffect(() => {
    fetch("/api/me")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        setUser(data.user);
        setAuthChecked(true);
      })
      .catch(() => {
        setUser(null);
        setAuthChecked(true);
      });
  }, [currentPath]);

  if (!authChecked) {
    return (
      <div className="initial-splash">
        <Leaf className="spin-slow" />
        <h2>AGO MOM + AGO DAD</h2>
        <p>Loading affiliate platform...</p>
      </div>
    );
  }

  // Router
  if (currentPath === "/admin/login") {
    if (user && user.role === "admin") {
      navigate("/admin/dashboard");
      return null;
    }
    return <Login navigate={navigate} type="admin" onLogin={setUser} />;
  }
  if (currentPath === "/sale/login") {
    if (user && user.role === "sale") {
      navigate("/sale/dashboard");
      return null;
    }
    return <Login navigate={navigate} type="sale" onLogin={setUser} />;
  }
  if (currentPath.startsWith("/admin")) {
    if (!user || user.role !== "admin") {
      navigate("/admin/login");
      return null;
    }
    return <AdminLayout currentPath={currentPath} navigate={navigate} user={user} onLogout={() => setUser(null)} />;
  }
  if (currentPath.startsWith("/sale")) {
    if (!user || user.role !== "sale") {
      navigate("/sale/login");
      return null;
    }
    return <SaleLayout navigate={navigate} user={user} onLogout={() => setUser(null)} />;
  }

  return <LandingPage />;
}

createRoot(document.getElementById("root")).render(<App />);
