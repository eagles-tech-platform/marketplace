import LegalDialog from "./LegalDialog";

/** The "I agree to the Terms, Privacy Policy and Cookie Policy" checkbox for sign-up forms. */
export default function LegalConsent({
  checked,
  onChange,
  required = true,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="I agree to the Terms of Service, Privacy Policy and Cookie Policy"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-500 focus:ring-teal-200"
      />
      <p>
        I agree to the <LegalDialog doc="terms">Terms of Service</LegalDialog>,{" "}
        <LegalDialog doc="privacy">Privacy Policy</LegalDialog> and{" "}
        <LegalDialog doc="cookies">Cookie Policy</LegalDialog>.
      </p>
    </div>
  );
}
