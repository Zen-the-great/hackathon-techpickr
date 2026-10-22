import { Link } from "react-router-dom";
import "./Button.css";

function Content({ children, arrow }) {
  return (
    <>
      <span className="btn-label">{children}</span>
      {arrow && (
        <span className="btn-arrow" aria-hidden="true">
          →
        </span>
      )}
    </>
  );
}

function Button({
  children,
  variant = "primary",
  href,
  to,
  onClick,
  arrow = false,
  disabled = false,
}) {
  const className = `btn btn-${variant}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        <Content arrow={arrow}>{children}</Content>
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={className}>
        <Content arrow={arrow}>{children}</Content>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      <Content arrow={arrow}>{children}</Content>
    </button>
  );
}

export default Button;