"use client";
import { useState, FormEvent } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Link2 } from "lucide-react";
import AuthModel from "./authmodel";
import { User } from "@/utils/types";
import { addProdcut } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const ProductForm = ({
  user,
  onSuccess,
}: {
  user?: User | null;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAuthModel, setShowAuthModel] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModel(true);
      return;
    }
    setIsLoading(true);

    const formData = new FormData();
    formData.append("url", url);

    try {
      const result = await addProdcut(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result?.message || "Product tracked successfully");
        setUrl("");
        router.refresh();
        onSuccess?.();
      }
    } catch {
      toast.error("Could not add this product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
      >
        <Link2 className="ml-3 h-4 w-4 shrink-0 text-neutral-400" />
        <Input
          aria-label="Product URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL…"
          className="h-10 flex-1 [&_input]:h-full [&_input]:leading-normal border-none bg-transparent text-sm shadow-none placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          required
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only">Checking product</span>
            </>
          ) : (
            "Track price"
          )}
        </Button>
      </form>
      <AuthModel
        isOpen={showAuthModel}
        onClose={() => setShowAuthModel(false)}
      />
    </>
  );
};

export default ProductForm;
