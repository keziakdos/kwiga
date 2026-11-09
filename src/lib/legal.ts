export const legal = {
  editorName: process.env.LEGAL_EDITOR_NAME || "",
  editorRole: process.env.LEGAL_EDITOR_ROLE || "",
  contactEmail: process.env.LEGAL_CONTACT_EMAIL || "",
  country: process.env.LEGAL_COUNTRY || "",
  hosting: process.env.LEGAL_HOSTING || "",
};

export function isLegalConfigured(): boolean {
  return Boolean(legal.editorName && legal.contactEmail);
}
