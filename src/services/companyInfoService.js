import { db, FieldValue } from "../config/firebase.js";
import { FINANCE_COLLECTIONS } from "../config/financeCollections.js";

const COMPANY_INFO_DOC_ID = "main";

export const companyInfoService = {
  COMPANY_INFO_DOC_ID,

  async getCompanyInfo() {
    const snap = await db.collection(FINANCE_COLLECTIONS.COMPANY_INFOS).doc(COMPANY_INFO_DOC_ID).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  },

  async updateCompanyInfo(updates = {}) {
    const allowed = {};
    ["name", "sharePrice", "branch", "description"].forEach((key) => {
      if (updates[key] !== undefined) allowed[key] = updates[key];
    });
    allowed.updatedAt = FieldValue.serverTimestamp();

    const ref = db.collection(FINANCE_COLLECTIONS.COMPANY_INFOS).doc(COMPANY_INFO_DOC_ID);
    await ref.set(allowed, { merge: true });
    const snap = await ref.get();
    return { id: snap.id, ...snap.data() };
  }
};
