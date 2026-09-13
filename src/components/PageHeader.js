function PageHeader({ eyebrow, icon: Icon, title, description, actions }) {
  return (
    <section className="page-heading page-hero">
      <div>
        {eyebrow && (
          <div className="heading-label">
            {Icon && <Icon size={16} />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions ? <div className="page-heading-actions">{actions}</div> : null}
    </section>
  );
}

export default PageHeader;
