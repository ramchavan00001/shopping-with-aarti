import { createContext, useContext } from "react";
import type { AdminConfig } from "@shared/admin";

export const AdminConfigContext = createContext<AdminConfig & { reload: () => void }>({
  uploadsEnabled: false,
  mediaBaseUrl: null,
  nextReelCode: "A100",
  reload: () => {},
});
export const useAdminConfig = () => useContext(AdminConfigContext);
