import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {item.to && !last ? <Link to={item.to}>{item.label}</Link> : <span aria-current={last ? "page" : undefined}>{item.label}</span>}
              {!last && <ChevronRight aria-hidden="true" size={14} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
