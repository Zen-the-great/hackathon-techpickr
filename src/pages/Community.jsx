import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CATEGORIES, CONDITIONS, SAMPLE_LISTINGS } from "../community/data";
import "./Community.css";

const LISTINGS_KEY = "techpickr.community.listings.v1";
const SAVED_KEY = "techpickr.community.saved.v1";
const REPORTS_KEY = "techpickr.community.reports.v1";
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 1_500_000;

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return { value: value ? JSON.parse(value) : fallback, error: "" };
  } catch {
    return { value: fallback, error: "storageUnavailable" };
  }
}

function getLocale(language) {
  return { en: "en-IN", hi: "hi-IN", es: "es-IN", fr: "fr-IN", de: "de-IN", ja: "ja-IN" }[language] || "en-IN";
}

function formatPrice(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

const categoryKeys = {
  All: "categoryAll", CPUs: "categoryCpus", GPUs: "categoryGpus", RAM: "categoryRam",
  Motherboards: "categoryMotherboards", Storage: "categoryStorage", "Power supplies": "categoryPower",
  Cases: "categoryCases", Cooling: "categoryCooling", "Complete PCs": "categoryCompletePcs",
  Laptops: "categoryLaptops", Monitors: "categoryMonitors", Peripherals: "categoryPeripherals",
};

function categoryLabel(category, t) {
  const key = categoryKeys[category];
  return key ? t(`community.${key}`) : category;
}

function conditionLabel(condition, t) {
  const key = { Used: "conditionUsed", Refurbished: "conditionRefurbished", New: "conditionNew" }[condition];
  return key ? t(`community.${key}`) : condition;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `listing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ProductImage({ src, title, category }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="cm-image-fallback" aria-label={`${categoryLabel(category, t)} ${t("community.listingUnavailable")}`}>
        <span aria-hidden="true">▦</span>
        <small>{categoryLabel(category, t)}</small>
      </div>
    );
  }

  return <img src={src} alt={title} loading="lazy" onError={() => setFailed(true)} />;
}

function ListingCard({ listing, saved, compared, onOpen, onSave, onCompare }) {
  const { t, i18n } = useTranslation();
  const locale = getLocale(i18n.language);
  return (
    <article className="cm-card">
      <button type="button" className="cm-card-main" onClick={onOpen}>
        <span className="cm-card-image">
          <ProductImage src={listing.images?.[0] || listing.image} title={listing.title} category={listing.category} />
          <span className={`cm-condition cm-condition-${listing.condition.toLowerCase()}`}>{conditionLabel(listing.condition, t)}</span>
          {listing.isSample && <span className="cm-sample-tag">{t("community.sample")}</span>}
        </span>
        <span className="cm-card-copy">
          <span className="cm-card-title">{listing.title}</span>
          <span className="cm-card-price">{formatPrice(listing.price, locale)}</span>
          <span className="cm-card-meta">{listing.location} <span>·</span> {formatDate(listing.postedAt, locale)}</span>
        </span>
      </button>
      <div className="cm-card-actions">
        <button
          type="button"
          className={`cm-icon-button ${saved ? "is-saved" : ""}`}
          aria-label={saved ? t("community.removeSaved") : t("community.saveListing")}
          aria-pressed={saved}
          onClick={onSave}
        >
          {saved ? "♥" : "♡"} <span>{saved ? t("community.savedLabel") : t("community.save")}</span>
        </button>
        <button
          type="button"
          className={`cm-compare-button ${compared ? "is-selected" : ""}`}
          aria-pressed={compared}
          onClick={onCompare}
        >
          {compared ? `✓ ${t("community.comparing")}` : `＋ ${t("community.compare")}`}
        </button>
      </div>
    </article>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("imageReadError"));
    reader.readAsDataURL(file);
  });
}

function ListingForm({ initialListing, onClose, onSave }) {
  const { t, i18n } = useTranslation();
  const locale = getLocale(i18n.language);
  const [form, setForm] = useState(() => ({
    title: initialListing?.title || "",
    category: initialListing?.category || "GPUs",
    brand: initialListing?.brand || "",
    price: initialListing?.price || "",
    condition: initialListing?.condition || "Used",
    description: initialListing?.description || "",
    location: initialListing?.location || "",
    cpu: initialListing?.specs?.cpu || "",
    gpu: initialListing?.specs?.gpu || "",
    ram: initialListing?.specs?.ram || "",
    storage: initialListing?.specs?.storage || "",
    warranty: initialListing?.specs?.warranty || "",
  }));
  const [images, setImages] = useState(initialListing?.images || (initialListing?.image ? [initialListing.image] : []));
  const [previewStep, setPreviewStep] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const addImages = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (images.length + selected.length > MAX_IMAGES) {
      setImageError(t("community.imageCountError", { count: MAX_IMAGES }));
      return;
    }
    const tooLarge = selected.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setImageError(t("community.imageSizeError", { name: tooLarge.name }));
      return;
    }
    setImageError("");
    try {
      const newImages = await Promise.all(selected.map(fileToDataUrl));
      setImages((current) => [...current, ...newImages]);
    } catch (error) {
      setImageError(t(`community.${error.message}`));
    }
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 5) next.title = t("community.titleError");
    if (!form.brand.trim()) next.brand = t("community.brandError");
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 1) next.price = t("community.priceError");
    if (form.description.trim().length < 20) next.description = t("community.descriptionError");
    if (!form.location.trim()) next.location = t("community.locationError");
    if (!images.length) next.images = t("community.imagesError");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const publish = async () => {
    setSaving(true);
    try {
      await onSave({
        ...(initialListing || {}),
        id: initialListing?.id || createId(),
        title: form.title.trim(),
        category: form.category,
        brand: form.brand.trim(),
        price: Number(form.price),
        condition: form.condition,
        description: form.description.trim(),
        location: form.location.trim(),
        postedAt: initialListing?.postedAt || new Date().toISOString(),
        images,
        seller: initialListing?.seller || "You",
        isOwner: true,
        isSample: false,
        specs: {
          cpu: form.cpu.trim(),
          gpu: form.gpu.trim(),
          ram: form.ram.trim(),
          storage: form.storage.trim(),
          warranty: form.warranty.trim(),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setPreviewStep(true);
  };

  return (
    <div className="cm-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="cm-dialog cm-form-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-form-heading">
        <div className="cm-dialog-heading">
          <div>
            <span className="cm-eyebrow">{initialListing ? t("community.yourListing") : t("community.sellOn")}</span>
            <h2 id="cm-form-heading">{previewStep ? t("community.previewListing") : initialListing ? t("community.editListing") : t("community.createListing")}</h2>
          </div>
          <button type="button" className="cm-close" onClick={onClose} aria-label={t("community.closeForm")}>×</button>
        </div>

        {previewStep ? (
          <>
            <p className="cm-preview-note">{t("community.previewNotice")}</p>
            <div className="cm-preview-card">
              <div className="cm-preview-image"><ProductImage src={images[0]} title={form.title} category={form.category} /></div>
              <div className="cm-preview-info">
                <span className={`cm-condition cm-condition-${form.condition.toLowerCase()}`}>{conditionLabel(form.condition, t)}</span>
                <h3>{form.title}</h3>
                <strong>{formatPrice(Number(form.price), locale)}</strong>
                <p>{form.location} · {form.brand} · {categoryLabel(form.category, t)}</p>
                <p>{form.description}</p>
              </div>
            </div>
            <div className="cm-form-actions">
              <button type="button" className="cm-secondary-button" onClick={() => setPreviewStep(false)}>{t("community.backEdit")}</button>
              <button type="button" className="cm-primary-button" disabled={saving} onClick={publish}>{saving ? t("community.publishing") : initialListing ? t("community.saveChanges") : t("community.publish")}</button>
            </div>
          </>
        ) : (
          <form className="cm-listing-form" onSubmit={handleSubmit} noValidate>
            <label className="cm-field cm-field-full">
              <span>{t("community.productTitle")} <b>*</b></span>
              <input value={form.title} maxLength={90} onChange={(event) => update("title", event.target.value)} placeholder="e.g. ASUS Dual GeForce RTX 4060 8GB" />
              {errors.title && <small className="cm-field-error">{errors.title}</small>}
            </label>
            <div className="cm-form-row">
              <label className="cm-field">
                <span>{t("community.category")} <b>*</b></span>
                <select value={form.category} onChange={(event) => update("category", event.target.value)}>
                  {CATEGORIES.slice(1).map((category) => <option key={category} value={category}>{categoryLabel(category, t)}</option>)}
                </select>
              </label>
              <label className="cm-field">
                <span>{t("community.brand")} <b>*</b></span>
                <input value={form.brand} onChange={(event) => update("brand", event.target.value)} placeholder="e.g. ASUS" />
                {errors.brand && <small className="cm-field-error">{errors.brand}</small>}
              </label>
            </div>
            <div className="cm-form-row">
              <label className="cm-field">
                <span>{t("community.askingPrice")} <b>*</b></span>
                <input type="number" min="1" step="1" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="₹" />
                {errors.price && <small className="cm-field-error">{errors.price}</small>}
              </label>
              <label className="cm-field">
                <span>{t("community.condition")} <b>*</b></span>
                <select value={form.condition} onChange={(event) => update("condition", event.target.value)}>
                  {CONDITIONS.map((condition) => <option key={condition} value={condition}>{conditionLabel(condition, t)}</option>)}
                </select>
              </label>
            </div>
            <label className="cm-field cm-field-full">
              <span>{t("community.description")} <b>*</b></span>
              <textarea rows="4" maxLength={1200} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={t("community.descriptionHint")} />
              {errors.description && <small className="cm-field-error">{errors.description}</small>}
            </label>
            <label className="cm-field cm-field-full">
              <span>{t("community.productImages")} <b>*</b> <small>{t("community.imageLimit", { count: MAX_IMAGES })}</small></span>
              <input type="file" accept="image/*" multiple onChange={addImages} />
              {errors.images && <small className="cm-field-error">{errors.images}</small>}
              {imageError && <small className="cm-field-error">{imageError}</small>}
              {images.length > 0 && (
                <span className="cm-image-previews">
                  {images.map((image, index) => (
                    <span className="cm-thumb" key={`${image.slice(0, 30)}-${index}`}>
                      <img src={image} alt={`${t("community.productImages")} ${index + 1}`} />
                      <button type="button" aria-label={`${t("community.removeImage")} ${index + 1}`} onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>×</button>
                    </span>
                  ))}
                </span>
              )}
            </label>
            <label className="cm-field cm-field-full">
              <span>{t("community.locationField")} <b>*</b></span>
              <input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder={t("community.cityArea")} />
              {errors.location && <small className="cm-field-error">{errors.location}</small>}
            </label>
            <fieldset className="cm-spec-fields">
              <legend>{t("community.hardwareSpecs")} <span>{t("community.optional")}</span></legend>
              <div className="cm-form-row">
                <label className="cm-field"><span>{t("community.cpuModel")}</span><input value={form.cpu} onChange={(event) => update("cpu", event.target.value)} placeholder="e.g. Ryzen 7 7800X3D" /></label>
                <label className="cm-field"><span>{t("community.gpuModel")}</span><input value={form.gpu} onChange={(event) => update("gpu", event.target.value)} placeholder="e.g. RTX 4070 Super" /></label>
              </div>
              <div className="cm-form-row">
                <label className="cm-field"><span>{t("community.ramCapacity")}</span><input value={form.ram} onChange={(event) => update("ram", event.target.value)} placeholder="e.g. 32GB DDR5" /></label>
                <label className="cm-field"><span>{t("community.storageCapacity")}</span><input value={form.storage} onChange={(event) => update("storage", event.target.value)} placeholder="e.g. 1TB NVMe SSD" /></label>
              </div>
              <label className="cm-field"><span>{t("community.warrantyStatus")}</span><input value={form.warranty} onChange={(event) => update("warranty", event.target.value)} placeholder="e.g. 8 months remaining" /></label>
            </fieldset>
            <p className="cm-local-disclosure">{t("community.localDisclosure")}</p>
            <div className="cm-form-actions">
              <button type="button" className="cm-secondary-button" onClick={onClose}>{t("community.cancel")}</button>
              <button type="submit" className="cm-primary-button">{t("community.preview")}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ListingDetails({ listing, onClose, saved, onSave, onEdit, onDelete, onReport, onContact, onCompatibility }) {
  const { t, i18n } = useTranslation();
  const locale = getLocale(i18n.language);
  const images = listing.images?.length ? listing.images : [listing.image].filter(Boolean);
  const [activeImage, setActiveImage] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("Misleading or inaccurate details");

  const specs = Object.entries(listing.specs || {}).filter(([, value]) => value);
  const specific = [
    ["CPU", listing.specs?.cpu],
    ["GPU", listing.specs?.gpu],
    ["Memory", listing.specs?.ram],
    ["Storage", listing.specs?.storage],
    ["Warranty", listing.specs?.warranty],
  ].filter(([, value]) => value);

  return (
    <div className="cm-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="cm-dialog cm-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-detail-title">
        <button type="button" className="cm-close cm-detail-close" onClick={onClose} aria-label={t("community.closeDetails")}>×</button>
        <div className="cm-detail-layout">
          <div className="cm-detail-gallery">
            <div className="cm-detail-main-image">
              <ProductImage src={images[activeImage]} title={listing.title} category={listing.category} />
            </div>
            {images.length > 1 && <div className="cm-gallery-thumbs">
              {images.map((image, index) => <button key={`${image.slice(0, 20)}-${index}`} type="button" className={index === activeImage ? "active" : ""} onClick={() => setActiveImage(index)}><img src={image} alt={`${t("community.viewImage")} ${index + 1}`} /></button>)}
            </div>}
          </div>
          <div className="cm-detail-content">
            <div className="cm-detail-topline">
              <span className={`cm-condition cm-condition-${listing.condition.toLowerCase()}`}>{conditionLabel(listing.condition, t)}</span>
              <span>{categoryLabel(listing.category, t)}</span>
              {listing.isSample && <span className="cm-sample-tag">{t("community.sample")}</span>}
            </div>
            <h2 id="cm-detail-title">{listing.title}</h2>
            <strong className="cm-detail-price">{formatPrice(listing.price, locale)}</strong>
            <p className="cm-detail-date">{listing.location} · {t("community.posted")} {formatDate(listing.postedAt, locale)}</p>
            <div className="cm-detail-actions">
              <button type="button" className="cm-primary-button" onClick={onContact}>{t("community.contactSeller")}</button>
              <button type="button" className={`cm-secondary-button ${saved ? "is-saved" : ""}`} onClick={onSave}>{saved ? `♥ ${t("community.savedLabel")}` : `♡ ${t("community.saveListingAction")}`}</button>
            </div>
            <section className="cm-detail-section">
              <h3>{t("community.aboutItem")}</h3>
              <p>{listing.description}</p>
            </section>
            <section className="cm-detail-section">
              <h3>{t("community.hardwareSpecs")}</h3>
              <dl className="cm-spec-list">
                {specific.map(([label, value]) => <div key={label}><dt>{label === "Memory" ? t("community.memory") : label}</dt><dd>{value}</dd></div>)}
                <div><dt>{t("community.brand")}</dt><dd>{listing.brand}</dd></div>
                {specs.length === 0 && <div><dt>{t("community.details")}</dt><dd>{t("community.noSpecs")}</dd></div>}
              </dl>
            </section>
            <section className="cm-seller">
              <span className="cm-seller-avatar">{(listing.seller || "S").slice(0, 1).toUpperCase()}</span>
              <span><strong>{listing.seller || t("community.communitySeller")}</strong><small>{t("community.communitySeller")} · {listing.location}</small></span>
              {listing.isOwner && <span className="cm-you-label">{t("community.yourListingLabel")}</span>}
            </section>
            <div className="cm-detail-footer">
              {["CPUs", "GPUs", "Motherboards", "RAM"].includes(listing.category) && <button type="button" className="cm-text-button" onClick={onCompatibility}>{t("community.checkCompatibility")}</button>}
              {listing.isOwner ? (
                <>
                  <button type="button" className="cm-text-button" onClick={onEdit}>{t("community.editListing")}</button>
                  <button type="button" className="cm-text-button cm-danger-text" onClick={onDelete}>{t("community.deleteListing")}</button>
                </>
              ) : (
                <button type="button" className="cm-text-button" onClick={() => setShowReport((value) => !value)}>{t("community.reportListing")}</button>
              )}
            </div>
            {showReport && (
              <form className="cm-report-form" onSubmit={(event) => { event.preventDefault(); onReport(reason); }}>
                <label className="cm-field"><span>{t("community.reportQuestion")}</span>
                  <select value={reason} onChange={(event) => setReason(event.target.value)}>
                    <option value="Misleading or inaccurate details">{t("community.reportMisleading")}</option>
                    <option value="Suspicious or potentially fraudulent">{t("community.reportSuspicious")}</option>
                    <option value="Prohibited item">{t("community.reportProhibited")}</option>
                    <option value="Other concern">{t("community.reportOther")}</option>
                  </select>
                </label>
                <button className="cm-secondary-button" type="submit">{t("community.submitReport")}</button>
                <small>{t("community.reportDisclosure")}</small>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Community() {
  const { t, i18n } = useTranslation();
  const locale = getLocale(i18n.language);
  const listingStore = useMemo(() => readStore(LISTINGS_KEY, []), []);
  const savedStore = useMemo(() => readStore(SAVED_KEY, []), []);
  const [ownListings, setOwnListings] = useState(listingStore.value);
  const [savedIds, setSavedIds] = useState(savedStore.value);
  const [storageNotice, setStorageNotice] = useState(listingStore.error || savedStore.error);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("Any condition");
  const [brand, setBrand] = useState("Any brand");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("browse");
  const [listingForm, setListingForm] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [notice, setNotice] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [infoDialog, setInfoDialog] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  const allListings = useMemo(
    () => [...ownListings, ...SAMPLE_LISTINGS.map((item) => ({ ...item, isSample: true }))],
    [ownListings],
  );
  const brands = useMemo(() => [...new Set(allListings.map((item) => item.brand).filter(Boolean))].sort(), [allListings]);
  const locations = useMemo(() => [...new Set(allListings.map((item) => item.location).filter(Boolean))].sort(), [allListings]);

  const filteredListings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minPrice === "" ? 0 : Number(minPrice);
    const max = maxPrice === "" ? Infinity : Number(maxPrice);
    const filtered = allListings.filter((item) => {
      const searchable = [item.title, item.category, item.brand, item.location, item.description, ...Object.values(item.specs || {})].join(" ").toLowerCase();
      return (category === "All" || item.category === category)
        && (!needle || searchable.includes(needle))
        && (condition === "Any condition" || item.condition === condition)
        && (brand === "Any brand" || item.brand === brand)
        && (!location || item.location.toLowerCase().includes(location.toLowerCase()))
        && item.price >= min
        && item.price <= max
        && (view !== "saved" || savedIds.includes(item.id))
        && (view !== "mine" || item.isOwner);
    });
    return filtered.sort((a, b) => sort === "lowest" ? a.price - b.price : sort === "highest" ? b.price - a.price : new Date(b.postedAt) - new Date(a.postedAt));
  }, [allListings, brand, category, condition, location, maxPrice, minPrice, query, savedIds, sort, view]);

  const persist = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageNotice("");
      return true;
    } catch {
      setStorageNotice("storageSaveError");
      return false;
    }
  };

  const toggleSaved = (item) => {
    const next = savedIds.includes(item.id) ? savedIds.filter((id) => id !== item.id) : [...savedIds, item.id];
    if (persist(SAVED_KEY, next)) setSavedIds(next);
  };

  const saveListing = async (item) => {
    const next = [item, ...ownListings.filter((existing) => existing.id !== item.id)];
    if (!persist(LISTINGS_KEY, next)) return;
    setOwnListings(next);
    setListingForm(null);
    setSelectedListing(item);
    setNotice(item.postedAt && ownListings.some((existing) => existing.id === item.id) ? "listingUpdated" : "listingPublished");
    window.setTimeout(() => setNotice(""), 4500);
  };

  const toggleCompare = (item) => {
    if (compareIds.includes(item.id)) {
      setCompareIds(compareIds.filter((id) => id !== item.id));
      return;
    }
    if (compareIds.length >= 3) {
      setNotice("compareLimit");
      window.setTimeout(() => setNotice(""), 3500);
      return;
    }
    setCompareIds([...compareIds, item.id]);
  };

  const removeListing = (item) => {
    if (!window.confirm(t("community.deleteConfirm"))) return;
    const next = ownListings.filter((entry) => entry.id !== item.id);
    if (!persist(LISTINGS_KEY, next)) return;
    setOwnListings(next);
    const nextSaved = savedIds.filter((id) => id !== item.id);
    if (persist(SAVED_KEY, nextSaved)) setSavedIds(nextSaved);
    setCompareIds((current) => current.filter((id) => id !== item.id));
    setSelectedListing(null);
    setNotice("listingDeleted");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const saveReport = (item, reason) => {
    const storedReports = readStore(REPORTS_KEY, []);
    if (storedReports.error) {
      setStorageNotice(storedReports.error);
      return;
    }
    if (!persist(REPORTS_KEY, [...storedReports.value, { listingId: item.id, reason, reportedAt: new Date().toISOString() }])) return;
    setSelectedListing(null);
    setNotice("reportSaved");
    window.setTimeout(() => setNotice(""), 4500);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setCondition("Any condition");
    setBrand("Any brand");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  };

  const compareListings = allListings.filter((item) => compareIds.includes(item.id));
  const featured = SAMPLE_LISTINGS.slice(0, 3);

  return (
    <main className="community-page">
      <section className="cm-hero">
        <div className="cm-shell">
          <div className="cm-hero-copy">
            <span className="cm-eyebrow">{t("community.eyebrow")}</span>
            <h1>{t("community.title")}</h1>
            <p>{t("community.subtitle")}</p>
          </div>
          <div className="cm-hero-actions">
            <button type="button" className="cm-primary-button" onClick={() => setListingForm({})}>＋ {t("community.sell")}</button>
            <button type="button" className="cm-outline-button" onClick={() => { setView("mine"); setCategory("All"); }}>{t("community.yourListings")} <span>{ownListings.length}</span></button>
          </div>
          <form className="cm-search" onSubmit={(event) => event.preventDefault()}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("community.searchPlaceholder")} aria-label={t("community.search")} />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={t("community.clearSearch")}>×</button>}
            <kbd>{t("community.search")}</kbd>
          </form>
        </div>
      </section>

      <div className="cm-shell cm-content">
        <div className="cm-prototype-notice"><span>{t("community.localPrototype")}</span> {t("community.prototypeNotice")}</div>

        <section className="cm-picks">
          <div className="cm-section-title">
            <div><span className="cm-eyebrow">{t("community.curated")}</span><h2>{t("community.picks")}</h2></div>
            <span>{t("community.sampleNote")}</span>
          </div>
          <div className="cm-picks-grid">
            {featured.map((item) => (
              <button type="button" key={item.id} className="cm-pick" onClick={() => setSelectedListing({ ...item, isSample: true })}>
                <span className="cm-pick-image"><ProductImage src={item.image} title={item.title} category={item.category} /></span>
                <span><small>{categoryLabel(item.category, t)} <b>·</b> {conditionLabel(item.condition, t)}</small><strong>{item.title}</strong><b>{formatPrice(item.price, locale)}</b></span>
                <span className="cm-pick-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cm-marketplace" aria-labelledby="cm-market-heading">
          <div className="cm-market-head">
            <div><span className="cm-eyebrow">{t("community.marketplace")}</span><h2 id="cm-market-heading">{t("community.browse")}</h2></div>
            <div className="cm-view-tabs" role="tablist" aria-label={t("community.listingView")}>
              <button type="button" role="tab" aria-selected={view === "browse"} className={view === "browse" ? "active" : ""} onClick={() => setView("browse")}>{t("community.discover")}</button>
              <button type="button" role="tab" aria-selected={view === "saved"} className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>{t("community.saved")} <span>{savedIds.length}</span></button>
              <button type="button" role="tab" aria-selected={view === "mine"} className={view === "mine" ? "active" : ""} onClick={() => setView("mine")}>{t("community.yourListings")} <span>{ownListings.length}</span></button>
            </div>
          </div>

          <div className="cm-categories" aria-label={t("community.filterCategory")}>
            {CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item, t)}</button>)}
          </div>

          <div className="cm-filters">
            <label className="cm-filter"><span>{t("community.priceRange")}</span><div className="cm-price-range">
              <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder={`${t("community.minimum")} ₹`} aria-label={t("community.minimumPrice")} />
              <span>–</span>
              <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder={`${t("community.maximum")} ₹`} aria-label={t("community.maximumPrice")} />
            </div></label>
            <label className="cm-filter"><span>{t("community.condition")}</span><select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="Any condition">{t("community.anyCondition")}</option>{CONDITIONS.map((item) => <option key={item} value={item}>{conditionLabel(item, t)}</option>)}</select></label>
            <label className="cm-filter"><span>{t("community.brand")}</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="Any brand">{t("community.anyBrand")}</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="cm-filter"><span>{t("community.location")}</span><input list="cm-locations" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t("community.cityArea")} /><datalist id="cm-locations">{locations.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label className="cm-filter"><span>{t("community.sortBy")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{t("community.newest")}</option><option value="lowest">{t("community.lowestPrice")}</option><option value="highest">{t("community.highestPrice")}</option></select></label>
          </div>

          {(storageNotice || notice) && <div className={`cm-alert ${storageNotice ? "cm-alert-error" : ""}`} role="status">{t(`community.${storageNotice || notice}`)}<button type="button" onClick={() => { setNotice(""); if (!storageNotice) setStorageNotice(""); }} aria-label={t("community.dismissMessage")}>×</button></div>}
          <div className="cm-results-line"><span>{view === "saved" ? t("community.savedListings") : view === "mine" ? t("community.yourListings") : t("community.listings")} <b>{filteredListings.length.toLocaleString(locale)}</b></span>{(query || category !== "All" || condition !== "Any condition" || brand !== "Any brand" || location || minPrice || maxPrice) && <button type="button" className="cm-text-button" onClick={clearFilters}>{t("community.clearFilters")}</button>}</div>

          {loading ? (
            <div className="cm-state"><span className="cm-spinner" /><h3>{t("community.loading")}</h3><p>{t("community.loadingText")}</p></div>
          ) : filteredListings.length ? (
            <div className="cm-grid">
              {filteredListings.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  saved={savedIds.includes(item.id)}
                  compared={compareIds.includes(item.id)}
                  onOpen={() => setSelectedListing(item)}
                  onSave={() => toggleSaved(item)}
                  onCompare={() => toggleCompare(item)}
                />
              ))}
            </div>
          ) : (
            <div className="cm-state cm-empty-state">
              <span className="cm-empty-icon" aria-hidden="true">⌕</span>
              <h3>{view === "saved" ? t("community.noSaved") : view === "mine" ? t("community.noMine") : t("community.noResults")}</h3>
              <p>{view === "saved" ? t("community.saveLater") : view === "mine" ? t("community.listComponent") : t("community.trySearch")}</p>
              {view === "mine" ? <button type="button" className="cm-primary-button" onClick={() => setListingForm({})}>＋ {t("community.sell")}</button> : <button type="button" className="cm-secondary-button" onClick={clearFilters}>{t("community.clearFilters")}</button>}
            </div>
          )}
        </section>
      </div>

      {compareIds.length > 0 && <div className="cm-compare-dock">
        <span><b>{compareIds.length.toLocaleString(locale)}</b> {t("community.selected")}</span>
        <button type="button" className="cm-primary-button" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>{t("community.compare")} {compareIds.length > 1 ? `(${compareIds.length.toLocaleString(locale)})` : ""}</button>
        <button type="button" className="cm-text-button" onClick={() => setCompareIds([])}>{t("community.clear")}</button>
      </div>}

      {listingForm && <ListingForm
        key={listingForm.id || "new"}
        initialListing={listingForm.id ? listingForm : null}
        onClose={() => setListingForm(null)}
        onSave={saveListing}
      />}
      {selectedListing && <ListingDetails
        key={selectedListing.id}
        listing={selectedListing}
        saved={savedIds.includes(selectedListing.id)}
        onClose={() => setSelectedListing(null)}
        onSave={() => toggleSaved(selectedListing)}
        onEdit={() => { setListingForm(selectedListing); setSelectedListing(null); }}
        onDelete={() => removeListing(selectedListing)}
        onContact={() => setInfoDialog("contact")}
        onCompatibility={() => setInfoDialog("compatibility")}
        onReport={(reason) => saveReport(selectedListing, reason)}
      />}
      {compareOpen && <div className="cm-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCompareOpen(false)}>
        <section className="cm-dialog cm-compare-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-compare-title">
          <div className="cm-dialog-heading"><div><span className="cm-eyebrow">{t("community.sideBySide")}</span><h2 id="cm-compare-title">{t("community.compareListings")}</h2></div><button type="button" className="cm-close" onClick={() => setCompareOpen(false)} aria-label={t("community.closeComparison")}>×</button></div>
          <div className="cm-table-wrap"><table className="cm-compare-table"><thead><tr><th>{t("community.detailsLabel")}</th>{compareListings.map((item) => <th key={item.id}>{item.title}</th>)}</tr></thead><tbody>
            {[[t("community.price"), (item) => formatPrice(item.price, locale)], [t("community.condition"), (item) => conditionLabel(item.condition, t)], [t("community.category"), (item) => categoryLabel(item.category, t)], [t("community.brand"), (item) => item.brand], [t("community.location"), (item) => item.location], ["CPU", (item) => item.specs?.cpu || t("community.notProvided")], ["GPU", (item) => item.specs?.gpu || t("community.notProvided")], ["RAM", (item) => item.specs?.ram || t("community.notProvided")], [t("community.categoryStorage"), (item) => item.specs?.storage || t("community.notProvided")], [t("community.warrantyStatus"), (item) => item.specs?.warranty || t("community.notProvided")]].map(([label, getValue]) => <tr key={label}><th>{label}</th>{compareListings.map((item) => <td key={item.id}>{getValue(item)}</td>)}</tr>)}
          </tbody></table></div>
          <p className="cm-local-disclosure">{t("community.comparisonNote")}</p>
        </section>
      </div>}
      {infoDialog && <div className="cm-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setInfoDialog("")}>
        <section className="cm-dialog cm-info-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-info-title">
          <button type="button" className="cm-close" onClick={() => setInfoDialog("")} aria-label={t("community.closeInfo")}>×</button>
          <span className="cm-eyebrow">{infoDialog === "contact" ? t("community.sellerContact") : t("community.compatibility")}</span>
          <h2 id="cm-info-title">{infoDialog === "contact" ? t("community.contactUnavailableTitle") : t("community.compatibilityUnavailableTitle")}</h2>
          <p>{infoDialog === "contact" ? t("community.contactUnavailableText") : t("community.compatibilityUnavailableText")}</p>
          {infoDialog === "compatibility" && <Link className="cm-secondary-button cm-inline-link" to="/build">{t("community.openBuilder")}</Link>}
          <button type="button" className="cm-primary-button" onClick={() => setInfoDialog("")}>{t("community.gotIt")}</button>
        </section>
      </div>}
    </main>
  );
}

export default Community;
