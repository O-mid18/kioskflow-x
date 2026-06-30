"use client";

import { useEffect } from "react";

export default function SupplierLegacyRedirect() {
  useEffect(() => {
    window.location.href = "/supplier/dashboard";
  }, []);

  return null;
}
