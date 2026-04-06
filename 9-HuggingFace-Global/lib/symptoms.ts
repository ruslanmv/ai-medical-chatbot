/**
 * Static symptom catalog used by the SEO landing pages at
 * `/symptoms/[slug]`. Each entry is pre-rendered as its own HTML page
 * at build time, with FAQPage JSON-LD embedded for Google rich results.
 *
 * All content is general patient education aligned with WHO, CDC, and
 * NHS public guidance. Nothing here is a diagnosis; every page ends
 * with a clear "not a substitute for a clinician" disclaimer and a CTA
 * pointing users into the live MedOS chatbot.
 *
 * IMPORTANT — DO NOT add clinical dosing, prescription instructions, or
 * definitive diagnoses to this file. Keep it educational.
 */

export interface SymptomFaq {
  q: string;
  a: string;
}

export interface Symptom {
  slug: string;
  title: string;
  metaDescription: string;
  headline: string;
  summary: string;
  redFlags: string[];
  selfCare: string[];
  whenToSeekCare: string[];
  faqs: SymptomFaq[];
}

export const SYMPTOMS: Symptom[] = [
  {
    slug: 'headache',
    title: 'Headache — causes, self-care, when to worry | MedOS',
    metaDescription:
      'What a headache can mean, how to relieve it safely at home, and the red flags that need urgent medical care. Free guidance aligned with WHO, CDC, and NHS.',
    headline: 'Headache',
    summary:
      'Most headaches are benign tension-type or migraine and resolve with rest, hydration, and over-the-counter analgesics. A small minority are signals of something serious and need urgent assessment — this page helps you tell the difference.',
    redFlags: [
      'Sudden "worst headache of your life", often described as thunderclap.',
      'Headache with fever, stiff neck, or rash.',
      'Headache with new weakness, numbness, vision loss, or speech changes.',
      'Headache after a head injury.',
      'Headache that progressively worsens over days or weeks.',
    ],
    selfCare: [
      'Drink water — mild dehydration is a common headache trigger.',
      'Rest in a dark, quiet room for 30–60 minutes.',
      'Apply a cool cloth to your forehead or the back of your neck.',
      'Consider an over-the-counter analgesic only if you have taken it safely before; do not exceed the package dose.',
      'Limit screen time and avoid skipping meals.',
    ],
    whenToSeekCare: [
      'Your headache is the worst you have ever had or came on in seconds.',
      'Headaches are becoming more frequent or more severe.',
      'Over-the-counter medicine is not helping after 2–3 days.',
      'You are pregnant and develop a new, severe headache.',
    ],
    faqs: [
      {
        q: 'Is a daily headache normal?',
        a: 'No. Chronic daily headache (more than 15 days a month) is worth discussing with a clinician — common causes include medication overuse, stress, tension, poor sleep, or dehydration, but persistent headaches should always be evaluated.',
      },
      {
        q: 'Can dehydration really cause a headache?',
        a: 'Yes. Even mild dehydration can trigger a dull, throbbing headache in many people. Rehydrating and resting in a quiet environment typically helps within an hour.',
      },
      {
        q: 'What is a thunderclap headache?',
        a: 'A thunderclap headache reaches peak intensity within 60 seconds and is one of the strongest red flags in medicine. It can indicate a brain bleed and needs emergency assessment immediately.',
      },
      {
        q: 'Are migraines the same as bad headaches?',
        a: 'No. Migraines are a distinct neurological condition that usually involve throbbing pain on one side of the head, sensitivity to light and sound, and sometimes nausea or visual aura.',
      },
    ],
  },

  {
    slug: 'fever',
    title: 'Fever in adults and children — what to do | MedOS',
    metaDescription:
      'When a fever is safe to manage at home and when it becomes an emergency. Free, WHO-aligned guidance for adults, children, and infants.',
    headline: 'Fever',
    summary:
      'Fever is a normal immune response, not a disease by itself. For most adults a temperature under 39 °C (102 °F) can be managed at home with rest and fluids. In infants under 3 months, any fever is an emergency.',
    redFlags: [
      'Any fever in an infant under 3 months old.',
      'Fever with a stiff neck, severe headache, or rash that does not fade under pressure.',
      'Fever with confusion, difficulty breathing, chest pain, or seizures.',
      'Fever above 40 °C (104 °F) that is not coming down with paracetamol or ibuprofen.',
      'Fever lasting more than 3 days in an adult or more than 24 hours in a young child.',
    ],
    selfCare: [
      'Rest and drink plenty of fluids (water, oral rehydration solution, clear broth).',
      'Dress in light layers — overwrapping can trap heat.',
      'Consider paracetamol or ibuprofen at standard dosing if you have taken them safely before.',
      'Monitor temperature every 2–4 hours and note any new symptoms.',
    ],
    whenToSeekCare: [
      'The person is very young, elderly, pregnant, or immunocompromised.',
      'Fever is accompanied by shortness of breath, chest pain, or confusion.',
      'There are red-flag symptoms listed above.',
    ],
    faqs: [
      {
        q: 'At what temperature is it officially a fever?',
        a: 'In adults and older children, a fever is generally defined as a body temperature of 38 °C (100.4 °F) or higher measured orally. In infants the threshold is the same but any fever under 3 months is urgent.',
      },
      {
        q: 'Can I give paracetamol and ibuprofen together?',
        a: 'They can be alternated in certain situations, but it depends on age, weight, and other medications. Do not combine them without guidance from a clinician or pharmacist.',
      },
      {
        q: 'Does a high fever cause brain damage?',
        a: 'Brain damage from fever itself is extremely rare. Most concerning fevers are signals of an underlying infection that needs evaluation — the fever number alone is not the danger.',
      },
      {
        q: 'Should I use a cold bath to bring a fever down?',
        a: 'No. Cold baths can cause shivering, which actually raises core temperature. Lukewarm sponging and light clothing are safer.',
      },
    ],
  },

  {
    slug: 'chest-pain',
    title: 'Chest pain — is it serious? | MedOS',
    metaDescription:
      'How to assess chest pain, when to call emergency services, and common non-cardiac causes. Free patient guidance aligned with WHO, CDC, and NHS.',
    headline: 'Chest pain',
    summary:
      'Chest pain can come from the heart, lungs, muscles, or digestive system. Some causes are life-threatening and need emergency care within minutes. Any new, severe, or persistent chest pain should be taken seriously.',
    redFlags: [
      'Crushing, squeezing, or heavy chest pain lasting more than a few minutes.',
      'Chest pain radiating to the jaw, neck, shoulder, or left arm.',
      'Chest pain with shortness of breath, sweating, nausea, or dizziness.',
      'Chest pain after recent surgery, long travel, or a leg that is painful and swollen (possible blood clot).',
      'Chest pain with fainting.',
    ],
    selfCare: [
      'Only if you are confident the pain is muscular or from a known condition: rest, gentle stretching, and paracetamol may help.',
      'Avoid heavy meals if the pain seems related to reflux.',
      'Do not drive yourself to the hospital if you suspect a heart attack — call emergency services.',
    ],
    whenToSeekCare: [
      'ANY new severe chest pain — call your local emergency number now.',
      'Chest pain with any of the red flags above.',
      'Recurring chest pain even if mild, over several days.',
    ],
    faqs: [
      {
        q: 'Is chest pain always a heart attack?',
        a: 'No. Chest pain has many causes — muscle strain, acid reflux, anxiety, lung conditions, and more. But because heart attacks can present subtly, any new or severe chest pain should be evaluated urgently.',
      },
      {
        q: 'What does a heart attack feel like?',
        a: 'Classic symptoms include heavy, squeezing chest pressure lasting more than a few minutes, often radiating to the arm or jaw, with sweating, nausea, and shortness of breath. Women, older adults, and people with diabetes may have more subtle symptoms.',
      },
      {
        q: 'Can anxiety cause real chest pain?',
        a: 'Yes. Panic attacks commonly cause sharp, tight chest pain with shortness of breath and tingling. But because the symptoms can mimic cardiac causes, a first episode should still be evaluated by a clinician.',
      },
    ],
  },

  {
    slug: 'cough',
    title: 'Cough — when to worry, how to soothe it | MedOS',
    metaDescription:
      'Dry vs. wet cough, how long it should last, and the red flags that mean you should be seen. Free guidance aligned with WHO, CDC, and NHS.',
    headline: 'Cough',
    summary:
      'Most coughs are caused by viral infections and resolve in 1–3 weeks. Antibiotics do not help a viral cough. Warning signs include blood in the sputum, weight loss, high fever, or breathlessness.',
    redFlags: [
      'Coughing up blood.',
      'Shortness of breath at rest.',
      'Chest pain with coughing.',
      'Cough lasting more than 3 weeks.',
      'Unintentional weight loss or night sweats.',
    ],
    selfCare: [
      'Drink warm fluids — water, tea with honey, or broth.',
      'Use a humidifier or inhale steam from a bowl of hot water.',
      'Honey (not for infants under 12 months) can ease nighttime cough.',
      'Rest and avoid smoke exposure.',
    ],
    whenToSeekCare: [
      'Cough is getting worse after 5–7 days instead of better.',
      'High fever persists beyond 3 days.',
      'Any of the red flags above.',
    ],
    faqs: [
      {
        q: 'Should I take antibiotics for a cough?',
        a: 'Usually no. Most coughs are viral, and antibiotics do not work against viruses. A clinician will consider antibiotics only if there are signs of a bacterial infection like pneumonia.',
      },
      {
        q: 'How long should a cough last?',
        a: 'A typical viral cough can last 1–3 weeks. A cough that lasts more than 3 weeks, or that comes with weight loss or blood, should be evaluated.',
      },
    ],
  },

  {
    slug: 'sore-throat',
    title: 'Sore throat — viral, bacterial, or something else | MedOS',
    metaDescription:
      'How to tell a viral sore throat from strep, what actually helps, and when to see a clinician. Free guidance aligned with WHO, CDC, and NHS.',
    headline: 'Sore throat',
    summary:
      'Most sore throats are viral and improve in 3–7 days without antibiotics. Bacterial strep throat is less common and usually needs evaluation. Rest, fluids, and simple pain relief are the mainstay of self-care.',
    redFlags: [
      'Difficulty breathing or swallowing saliva.',
      'Drooling (especially in children) or a muffled voice.',
      'Neck swelling or stiff neck.',
      'Fever above 39 °C (102 °F) with severe throat pain.',
      'Sore throat lasting more than 1 week.',
    ],
    selfCare: [
      'Drink plenty of fluids and eat soft, soothing foods.',
      'Gargle with warm salt water several times a day.',
      'Throat lozenges or honey can help (no honey under 12 months).',
      'Consider paracetamol or ibuprofen for pain if previously tolerated.',
    ],
    whenToSeekCare: [
      'Pain is severe or preventing you from eating and drinking.',
      'You have a rash along with the sore throat.',
      'You suspect strep throat — sudden severe pain without cough, with fever and swollen neck glands.',
    ],
    faqs: [
      {
        q: 'Do I need antibiotics for strep throat?',
        a: 'Possibly. Strep is a bacterial infection confirmed by a rapid test or throat culture. If confirmed, antibiotics shorten symptoms and prevent complications. Viral sore throats do not benefit from antibiotics.',
      },
      {
        q: 'Is a sore throat a sign of COVID-19?',
        a: 'It can be. Sore throat is one of many possible COVID-19 symptoms along with cough, fever, fatigue, and loss of taste or smell. Home antigen tests and clinical evaluation help clarify.',
      },
    ],
  },

  {
    slug: 'back-pain',
    title: 'Back pain — causes, relief, and red flags | MedOS',
    metaDescription:
      'Common causes of back pain, how to relieve it safely at home, and the signs that mean you need imaging or urgent care. Free, WHO-aligned guidance.',
    headline: 'Back pain',
    summary:
      'Most acute back pain is muscular and improves within 2–6 weeks with gentle movement, pain relief, and avoiding prolonged bed rest. Imaging is usually not needed in the first 6 weeks unless red flags are present.',
    redFlags: [
      'Numbness, tingling, or weakness in the legs.',
      'Loss of bladder or bowel control (this is a medical emergency).',
      'Unexplained fever or weight loss.',
      'Back pain after significant trauma.',
      'History of cancer with new back pain.',
    ],
    selfCare: [
      'Stay gently active — prolonged bed rest makes back pain worse.',
      'Apply heat or cold packs for 15–20 minutes at a time.',
      'Simple stretching and walking when tolerated.',
      'Over-the-counter pain relief if previously safe.',
    ],
    whenToSeekCare: [
      'Pain is severe and not improving after a week of self-care.',
      'Any red flag symptoms above.',
      'Numbness or weakness in the legs is a reason to be seen urgently.',
    ],
    faqs: [
      {
        q: 'Do I need an MRI for back pain?',
        a: 'Usually not in the first 6 weeks of acute back pain unless red flags are present. Imaging often finds incidental changes that are not the source of pain, which can delay proper management.',
      },
      {
        q: 'Is bed rest good for back pain?',
        a: 'No. Extended bed rest actually delays recovery. Gentle, regular movement within pain limits is the modern evidence-based recommendation.',
      },
    ],
  },
];

/** Constant-time lookup by slug. */
export function getSymptomBySlug(slug: string): Symptom | undefined {
  return SYMPTOMS.find((s) => s.slug === slug);
}

export function getAllSymptomSlugs(): string[] {
  return SYMPTOMS.map((s) => s.slug);
}
