"use client"
import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepBreadcrumbProps {
  className?: string
  steps?: Array<{ id: string; name: string; status: "complete" | "current" | "upcoming" }>
}

export function Breadcrumb({
  className,
  steps = [
    { id: "01", name: "Warenkorb", status: "complete" },
    { id: "02", name: "Kasse", status: "current" },
    { id: "03", name: "Zahlung", status: "upcoming" },
    { id: "04", name: "Bestätigung", status: "upcoming" },
  ],
}: StepBreadcrumbProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 500)
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  return (
    <nav
      className={cn(
        "p-2 sm:p-3 rounded-xl overflow-x-auto scrollbar-hide",
        className,
      )}
      style={{ background: "var(--kf-bg)" }}
      aria-label="Progress"
    >
      <ol className={cn("flex w-full min-w-max", isMobile ? "flex-col space-y-3" : "items-center justify-between")}>
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={cn("relative", !isMobile && stepIdx !== steps.length - 1 && "pr-8 md:pr-16")}>
            {!isMobile && stepIdx !== steps.length - 1 && (
              <div
                className="absolute top-4 left-7 -ml-px mt-0.5 h-0.5 w-full"
                style={{ background: step.status === "complete" ? "#E8521A" : "var(--kf-border)" }}
                aria-hidden="true"
              />
            )}
            <div className={cn("group flex", isMobile ? "items-center" : "items-start")}>
              <span className="flex items-center">
                <span
                  className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    background:
                      step.status === "complete"
                        ? "#E8521A"
                        : "var(--kf-surface)",
                    border:
                      step.status === "complete"
                        ? "none"
                        : step.status === "current"
                        ? "2px solid #E8521A"
                        : "2px solid var(--kf-border)",
                  }}
                >
                  {step.status === "complete" ? (
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className="text-[10px] sm:text-xs font-semibold"
                      style={{
                        color: step.status === "current" ? "#E8521A" : "var(--kf-text3)",
                      }}
                    >
                      {step.id}
                    </span>
                  )}
                </span>
              </span>
              <span className="ml-2 text-[10px] sm:text-xs">
                <span
                  className="font-medium"
                  style={{
                    color:
                      step.status === "complete"
                        ? "var(--kf-text)"
                        : step.status === "current"
                        ? "#E8521A"
                        : "var(--kf-text3)",
                  }}
                >
                  {step.name}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
