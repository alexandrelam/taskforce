import { useState } from "react";
import { toast } from "sonner";
import { ticketsApi } from "@/lib/api";

const PR_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;

interface UsePrAutoFillParams {
  title: string;
  baseBranch: string;
  setTitle: (v: string) => void;
  setBaseBranch: (v: string) => void;
}

export function usePrAutoFill({ title, baseBranch, setTitle, setBaseBranch }: UsePrAutoFillParams) {
  const [isFetchingPr, setIsFetchingPr] = useState(false);

  const handlePrLinkPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text/plain").trim();
    if (!PR_URL_REGEX.test(pasted)) return;

    setIsFetchingPr(true);
    try {
      const info = await ticketsApi.getPrInfo(pasted);
      if (!title) setTitle(info.title);
      if (!baseBranch) setBaseBranch(info.headRefName);
    } catch (error) {
      toast.error("Failed to fetch PR info", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsFetchingPr(false);
    }
  };

  return { isFetchingPr, handlePrLinkPaste };
}
