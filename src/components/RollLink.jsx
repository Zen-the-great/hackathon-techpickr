import { NavLink } from "react-router-dom";
import "./RollLink.css";

// Page link:      <RollLink to="/build">Build</RollLink>
// Section link:   <RollLink href="/#features" onClick={...}>Features</RollLink>
// The text must be plain text (not other elements).
function RollLink({ to, href, children, ...rest }) {
  const text = (
    <span className="roll-text" data-text={children}>
      {children}
    </span>
  );

  if (href) {
    return (
      <a className="roll" href={href} {...rest}>
        {text}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `roll ${isActive ? "roll-active" : ""}`}
      {...rest}
    >
      {text}
    </NavLink>
  );
}

export default RollLink;
