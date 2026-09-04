import { AlertCircle, CheckCircle2 } from "lucide-react";

function AlertBanner({ type = "error", title, children }) {
  const isError = type === "error";

  return (
    <div className={`alert ${isError ? "error-alert" : "success-alert"}`}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={19} />}
      {title ? (
        <div>
          <strong>{title}</strong>
          {children ? <p>{children}</p> : null}
        </div>
      ) : (
        <span>{children}</span>
      )}
    </div>
  );
}

export default AlertBanner;
