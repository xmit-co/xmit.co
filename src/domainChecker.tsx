import { useState, useEffect } from "preact/hooks";
import { logError } from "./app.tsx";

// Validate full domain
export function validateDomain(domain: string): {
  valid: boolean;
  error?: string;
} {
  if (!domain) return { valid: true };
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(
      domain,
    )
  ) {
    return { valid: false, error: "Invalid domain format" };
  }
  if (domain.length > 253) {
    return { valid: false, error: "Domain too long (max 253 characters)" };
  }
  const domainParts = domain.split(".");
  if (domainParts.some((part) => part.length > 63)) {
    return {
      valid: false,
      error: "Domain label too long (max 63 characters per part)",
    };
  }
  if (domainParts.length < 2) {
    return {
      valid: false,
      error: "Domain must have at least two parts (e.g., example.com)",
    };
  }
  return { valid: true };
}

// Validate preset subdomain (should be exactly 1 part)
export function validatePresetSubdomain(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  if (!subdomain) return { valid: true };
  const subdomainOnly = subdomain.replace(/\.(xmit\.dev|madethis\.site)$/, "");
  if (!subdomainOnly) return { valid: true };
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(subdomainOnly)) {
    return { valid: false, error: "Invalid subdomain format" };
  }
  if (subdomainOnly.includes(".")) {
    return {
      valid: false,
      error: "Subdomain must be a single part (e.g., mysite)",
    };
  }
  if (subdomainOnly.length > 63) {
    return { valid: false, error: "Subdomain too long (max 63 characters)" };
  }
  return { valid: true };
}

export type DomainStatus = "Taken" | "Available" | "AlreadyPresent" | null;

export interface DomainCheckerState {
  domainMode: "preset" | "custom";
  setDomainMode: (mode: "preset" | "custom") => void;
  domain: string;
  setDomain: (domain: string) => void;
  presetDomain: string;
  setPresetDomain: (domain: string) => void;
  effectiveDomain: string;
  trimmedDomain: string;
  domainValidation: { valid: boolean; error?: string };
  showDomainError: boolean;
  domainStatus: DomainStatus;
  checkingDomain: boolean;
}

export function useDomainChecker(): DomainCheckerState {
  const [domainMode, setDomainMode] = useState<"preset" | "custom">("preset");
  const [domain, setDomain] = useState<string>("");
  const [presetDomain, setPresetDomain] = useState<string>("");
  const [domainStatus, setDomainStatus] = useState<DomainStatus>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);

  const effectiveDomain = domainMode === "preset" ? presetDomain : domain;
  const trimmedDomain = effectiveDomain.trim().toLowerCase();

  const domainValidation =
    domainMode === "custom"
      ? validateDomain(trimmedDomain)
      : validatePresetSubdomain(presetDomain);
  const showDomainError =
    domainMode === "custom"
      ? !!trimmedDomain && !domainValidation.valid
      : !!presetDomain && !domainValidation.valid;

  // Check domain status when domain changes
  useEffect(() => {
    if (!effectiveDomain || !domainValidation.valid) {
      setDomainStatus(null);
      setCheckingDomain(false);
      return;
    }

    const abortController = new AbortController();

    const checkDomainStatus = async () => {
      setCheckingDomain(true);
      try {
        const response = await fetch(
          `/api/web/status?domain=${encodeURIComponent(trimmedDomain)}`,
          { signal: abortController.signal },
        );
        if (response.ok) {
          const status = await response.text();
          setDomainStatus(status as DomainStatus);
        } else {
          setDomainStatus(null);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          logError(error instanceof Error ? error : String(error));
          setDomainStatus(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setCheckingDomain(false);
        }
      }
    };

    checkDomainStatus();
    return () => abortController.abort();
  }, [trimmedDomain, domainValidation.valid]);

  return {
    domainMode,
    setDomainMode,
    domain,
    setDomain,
    presetDomain,
    setPresetDomain,
    effectiveDomain,
    trimmedDomain,
    domainValidation,
    showDomainError,
    domainStatus,
    checkingDomain,
  };
}

export function DomainChecker({
  state,
  radioName = "domainMode",
}: {
  state: DomainCheckerState;
  radioName?: string;
}) {
  const {
    domainMode,
    setDomainMode,
    domain,
    setDomain,
    presetDomain,
    setPresetDomain,
    trimmedDomain,
    domainValidation,
    showDomainError,
    domainStatus,
    checkingDomain,
  } = state;

  return (
    <>
      <p>You can deploy to any domain you own, or use a free subdomain.</p>
      <p>
        <label style={{ marginRight: "16px" }}>
          <input
            type="radio"
            name={radioName}
            value="preset"
            checked={domainMode === "preset"}
            onChange={() => setDomainMode("preset")}
          />{" "}
          Free subdomain
        </label>
        <label style={{ marginRight: "16px" }}>
          <input
            type="radio"
            name={radioName}
            value="custom"
            checked={domainMode === "custom"}
            onChange={() => setDomainMode("custom")}
          />{" "}
          Custom domain
        </label>
      </p>
      <p>
        {domainMode === "preset" ? (
          <>
            <input
              type="text"
              placeholder="mysite"
              value={presetDomain.replace(/\.(xmit\.dev|madethis\.site)$/, "")}
              onInput={(e) => {
                const subdomain = (e.target as HTMLInputElement).value;
                setPresetDomain(subdomain ? `${subdomain}.xmit.dev` : "");
              }}
              onChange={(e) => {
                const subdomain = (e.target as HTMLInputElement).value;
                setPresetDomain(subdomain ? `${subdomain}.xmit.dev` : "");
              }}
              onKeyUp={(e) => {
                const subdomain = (e.target as HTMLInputElement).value;
                setPresetDomain(subdomain ? `${subdomain}.xmit.dev` : "");
              }}
              style={{ width: "10em", marginRight: "4px" }}
            />
            <select
              value={
                presetDomain.endsWith(".madethis.site")
                  ? ".madethis.site"
                  : ".xmit.dev"
              }
              onChange={(e) => {
                const suffix = (e.target as HTMLSelectElement).value;
                const subdomain = presetDomain.replace(
                  /\.(xmit\.dev|madethis\.site)$/,
                  "",
                );
                setPresetDomain(subdomain ? `${subdomain}${suffix}` : "");
              }}
              style={{ width: "auto" }}
            >
              <option value=".xmit.dev">.xmit.dev</option>
              <option value=".madethis.site">.madethis.site</option>
            </select>
          </>
        ) : (
          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onInput={(e) => setDomain((e.target as HTMLInputElement).value)}
            onChange={(e) => setDomain((e.target as HTMLInputElement).value)}
            onKeyUp={(e) => setDomain((e.target as HTMLInputElement).value)}
          />
        )}
      </p>
      {showDomainError && (
        <p style={{ color: "#f00" }}>⚠ {domainValidation.error}</p>
      )}
      {checkingDomain && trimmedDomain && (
        <p style={{ color: "#999" }}>🔍 Checking domain status…</p>
      )}
      {!checkingDomain && domainStatus === "Available" && (
        <p style={{ color: "#0a0" }}>✓ Available</p>
      )}
      {!checkingDomain && domainStatus === "Taken" && (
        <p style={{ color: "#f90" }}>⚠ Taken</p>
      )}
      {!checkingDomain && domainStatus === "AlreadyPresent" && (
        <p style={{ color: "#0af" }}>ℹ Already deployed</p>
      )}
    </>
  );
}
