import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import { TagInput } from '../components/TagInput';
import { Badge, ConfirmDialog, ErrorState, ExternalLink, PageHeader, SafeImage, Spinner } from '../components/ui';
import { errorMessage, fieldIssues } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtDateTime, fmtNum, humanize } from '../lib/format';
import { KIND_META } from '../lib/kinds';
import {
  apiPathToField, emptyForm, listingFormSchema, slugify, toFormValues, toListingInput, toListingPatch,
  TOGO_BOUNDS, type ListingFormValues,
} from '../lib/listingForm';
import {
  AMENITIES, CUISINES, HOTEL_TYPES, LISTING_STATUSES, PLACE_CATEGORIES, REGION_IDS,
  type AdminListing, type Kind, type Meta,
} from '../lib/types';

/* ------------------------------ helpers ------------------------------ */

function getError(errors: FieldErrors<ListingFormValues>, path: string): string | undefined {
  let cur: unknown = errors;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur && typeof cur === 'object') {
    const o = cur as { message?: unknown; root?: { message?: unknown } };
    if (typeof o.message === 'string') return o.message;
    if (o.root && typeof o.root.message === 'string') return o.root.message;
  }
  return undefined;
}

function Field({
  label, error, hint, children, className,
}: { label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className ?? ''}${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card form-section">
      <div className="form-section-head">
        <h2 className="card-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const Lang = ({ code }: { code: 'EN' | 'FR' }) => <span className={`lang lang-${code.toLowerCase()}`}>{code}</span>;

/* ------------------------------- page -------------------------------- */

export function ListingFormPage({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const meta = KIND_META[kind];

  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => endpoints.listing(id as string),
    enabled: !isNew,
  });
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta('en'), staleTime: 60 * 60 * 1000 });

  if (!isNew && listing.isPending) return <Spinner />;
  if (!isNew && listing.isError) {
    return <ErrorState message={errorMessage(listing.error)} onRetry={() => void listing.refetch()} />;
  }
  if (!isNew && listing.data && listing.data.kind !== kind) {
    return <ErrorState message={`This listing is a ${listing.data.kind}, not a ${kind}.`} />;
  }
  return <ListingForm key={id ?? 'new'} kind={kind} listing={isNew ? null : (listing.data ?? null)} meta={metaQ.data} label={meta.label} />;
}

function ListingForm({
  kind, listing, meta, label,
}: { kind: Kind; listing: AdminListing | null; meta: Meta | undefined; label: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const path = KIND_META[kind].path;
  const [slugTouched, setSlugTouched] = useState(Boolean(listing));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues = useMemo(() => (listing ? toFormValues(listing) : emptyForm(kind)), [listing, kind]);

  const {
    register, handleSubmit, control, setValue, setError, reset, getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const images = useFieldArray({ control, name: 'images' });
  const menu = useFieldArray({ control, name: 'menu' });

  const [region, nameEn, entryFree, watchedImages] = useWatch({
    control,
    name: ['region', 'name.en', 'entryFree', 'images'],
  });

  // Auto-generate the slug from the English name for new listings until the slug is edited by hand.
  useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(nameEn ?? ''), { shouldValidate: false });
  }, [nameEn, slugTouched, setValue]);

  const regions = meta?.regions ?? REGION_IDS.map((r) => ({ id: r, name: humanize(r), cities: [] as string[] }));
  const cities = useMemo(() => {
    const list = regions.find((r) => r.id === region)?.cities ?? [];
    const current = getValues('city');
    return current && !list.includes(current) ? [current, ...list] : list;
  }, [regions, region, getValues]);
  const labelFor = (list: { id: string; label: string }[] | undefined, value: string) =>
    list?.find((o) => o.id === value)?.label ?? humanize(value);

  const save = useMutation({
    mutationFn: async (v: ListingFormValues) =>
      listing ? endpoints.updateListing(listing.id, toListingPatch(v)) : endpoints.createListing(toListingInput(v)),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['listings', kind] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      qc.setQueryData(['listing', saved.id], saved);
      toast.show(listing ? `${label} saved` : `${label} created`, 'success');
      if (listing) reset(toFormValues(saved));
      else navigate(`/${path}/${encodeURIComponent(saved.id)}`, { replace: true });
    },
    onError: (e) => {
      const issues = fieldIssues(e);
      for (const i of issues) setError(apiPathToField(i.path) as Path<ListingFormValues>, { type: 'server', message: i.message });
      setServerError(errorMessage(e));
    },
  });

  const del = useMutation({
    mutationFn: () => endpoints.deleteListing(listing!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listings', kind] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      toast.show(`${label} deleted`, 'success');
      navigate(`/${path}`, { replace: true });
    },
    onError: (e) => toast.show(errorMessage(e), 'error'),
  });

  const onSubmit = handleSubmit(
    async (v) => {
      setServerError(null);
      await save.mutateAsync(v).catch(() => undefined);
    },
    () => setServerError('Please fix the highlighted fields.'),
  );

  const err = (p: string) => getError(errors, p);

  return (
    <form onSubmit={onSubmit} noValidate className="listing-form">
      <PageHeader
        title={listing ? listing.name.en : `New ${label.toLowerCase()}`}
        subtitle={
          listing
            ? `${fmtNum(listing.views)} views · ${listing.rating.toFixed(1)}★ (${fmtNum(listing.reviewCount)} reviews) · updated ${fmtDateTime(listing.updatedAt)}`
            : `Create a ${label.toLowerCase()} listing in English and French`
        }
        actions={
          <>
            {listing?.sponsored && <Badge tone="gold">Sponsored</Badge>}
            {listing && <Badge tone={listing.status}>{listing.status}</Badge>}
            <Link to={`/${path}`} className="btn btn-ghost">
              Cancel
            </Link>
            {listing && isAdmin && (
              <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || (Boolean(listing) && !isDirty)}>
              {isSubmitting ? 'Saving…' : listing ? 'Save changes' : `Create ${label.toLowerCase()}`}
            </button>
          </>
        }
      />

      {serverError && (
        <div className="alert alert-error" role="alert">
          {serverError}
        </div>
      )}

      <div className="form-grid">
        <div className="form-main">
          <Section title="Content">
            <div className="bilingual">
              <Field label={<><Lang code="EN" /> Name</>} error={err('name.en')}>
                <input {...register('name.en')} maxLength={120} />
              </Field>
              <Field label={<><Lang code="FR" /> Nom</>} error={err('name.fr')}>
                <input {...register('name.fr')} maxLength={120} lang="fr" />
              </Field>
              <Field label={<><Lang code="EN" /> Description</>} error={err('description.en')} hint="20–5000 characters, plain text">
                <textarea rows={7} {...register('description.en')} maxLength={5000} />
              </Field>
              <Field label={<><Lang code="FR" /> Description</>} error={err('description.fr')} hint="20–5000 caractères, texte brut">
                <textarea rows={7} {...register('description.fr')} maxLength={5000} lang="fr" />
              </Field>
              {kind === 'place' && (
                <>
                  <Field label={<><Lang code="EN" /> Opening hours</>} error={err('openingHours.en')} hint="e.g. Daily 08:00–18:00">
                    <input {...register('openingHours.en')} maxLength={200} />
                  </Field>
                  <Field label={<><Lang code="FR" /> Horaires</>} error={err('openingHours.fr')} hint="ex. Tous les jours 08h–18h">
                    <input {...register('openingHours.fr')} maxLength={200} lang="fr" />
                  </Field>
                </>
              )}
            </div>
          </Section>

          {kind === 'place' && (
            <Section title="Place details">
              <div className="grid-3">
                <Field label="Category" error={err('category')}>
                  <select {...register('category')}>
                    <option value="">Select…</option>
                    {PLACE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{labelFor(meta?.categories, c)}</option>
                    ))}
                  </select>
                </Field>
                <label className="field checkbox-field">
                  <span>Entry fee</span>
                  <span className="checkbox">
                    <input type="checkbox" {...register('entryFree')} /> Free entry
                  </span>
                </label>
                {!entryFree && (
                  <Field label="Amount (XOF)" error={err('entryFeeAmount')}>
                    <input type="number" min={0} step={1} inputMode="numeric" {...register('entryFeeAmount', { valueAsNumber: true })} />
                  </Field>
                )}
              </div>
              {!entryFree && (
                <Field label="Fee note" error={err('entryFeeNote')} hint="Optional, e.g. “Guide included”">
                  <input {...register('entryFeeNote')} maxLength={140} />
                </Field>
              )}
            </Section>
          )}

          {kind === 'restaurant' && (
            <Section
              title="Restaurant details"
            >
              <div className="grid-3">
                <Field label="Cuisine" error={err('cuisine')}>
                  <select {...register('cuisine')}>
                    <option value="">Select…</option>
                    {CUISINES.map((c) => (
                      <option key={c} value={c}>{labelFor(meta?.cuisines, c)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Price level" error={err('priceLevel')}>
                  <select {...register('priceLevel')}>
                    <option value="">Select…</option>
                    <option value="1">1 · Budget</option>
                    <option value="2">2 · Moderate</option>
                    <option value="3">3 · Upscale</option>
                    <option value="4">4 · Fine dining</option>
                  </select>
                </Field>
              </div>
              <div className="subsection">
                <div className="subsection-head">
                  <h3>Menu ({menu.fields.length})</h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={menu.fields.length >= 100}
                    onClick={() => menu.append({ name: '', price: Number.NaN, description: '' })}
                  >
                    + Add item
                  </button>
                </div>
                {err('menu') && <p className="field-error">{err('menu')}</p>}
                {menu.fields.length === 0 ? (
                  <p className="muted small">No menu items yet.</p>
                ) : (
                  <div className="rows">
                    {menu.fields.map((f, i) => (
                      <div key={f.id} className="row-editor menu-row">
                        <Field label="Item" error={err(`menu.${i}.name`)}>
                          <input {...register(`menu.${i}.name` as const)} maxLength={80} />
                        </Field>
                        <Field label="Price (XOF)" error={err(`menu.${i}.price`)}>
                          <input type="number" min={0} step={1} {...register(`menu.${i}.price` as const, { valueAsNumber: true })} />
                        </Field>
                        <Field label="Description" error={err(`menu.${i}.description`)} className="grow">
                          <input {...register(`menu.${i}.description` as const)} maxLength={200} />
                        </Field>
                        <button type="button" className="btn btn-ghost btn-sm row-remove" aria-label={`Remove menu item ${i + 1}`} onClick={() => menu.remove(i)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {kind === 'hotel' && (
            <Section title="Hotel details">
              <div className="grid-4">
                <Field label="Hotel type" error={err('hotelType')}>
                  <select {...register('hotelType')}>
                    <option value="">Select…</option>
                    {HOTEL_TYPES.map((c) => (
                      <option key={c} value={c}>{labelFor(meta?.hotelTypes, c)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Stars" error={err('stars')}>
                  <select {...register('stars')}>
                    <option value="">Unrated</option>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={String(s)}>{'★'.repeat(s)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Price / night min (XOF)" error={err('priceMin')}>
                  <input type="number" min={0} step={1} inputMode="numeric" {...register('priceMin', { valueAsNumber: true })} />
                </Field>
                <Field label="Price / night max (XOF)" error={err('priceMax')}>
                  <input type="number" min={0} step={1} inputMode="numeric" {...register('priceMax', { valueAsNumber: true })} />
                </Field>
              </div>
              <fieldset className="fieldset">
                <legend>Amenities</legend>
                <div className="checkbox-grid">
                  {AMENITIES.map((a) => (
                    <label key={a} className="checkbox">
                      <input type="checkbox" value={a} {...register('amenities')} />
                      {labelFor(meta?.amenities, a)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </Section>
          )}

          <Section title="Location">
            <div className="grid-3">
              <Field label="Region" error={err('region')}>
                <select
                  {...register('region', {
                    onChange: () => setValue('city', '', { shouldDirty: true }),
                  })}
                >
                  <option value="">Select…</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="City" error={err('city')}>
                {cities.length > 0 ? (
                  <select {...register('city')} disabled={!region}>
                    <option value="">{region ? 'Select…' : 'Select a region first'}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input {...register('city')} maxLength={60} disabled={!region} placeholder={region ? '' : 'Select a region first'} />
                )}
              </Field>
              <Field label="Address" error={err('address')} hint="Optional">
                <input {...register('address')} maxLength={200} />
              </Field>
              <Field label="Latitude" error={err('lat')} hint={`${TOGO_BOUNDS.latMin} to ${TOGO_BOUNDS.latMax}`}>
                <input type="number" step="any" inputMode="decimal" {...register('lat', { valueAsNumber: true })} />
              </Field>
              <Field label="Longitude" error={err('lng')} hint={`${TOGO_BOUNDS.lngMin} to ${TOGO_BOUNDS.lngMax}`}>
                <input type="number" step="any" inputMode="decimal" {...register('lng', { valueAsNumber: true })} />
              </Field>
            </div>
          </Section>

          <Section
            title={`Images (${images.fields.length}/15)`}
            aside={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={images.fields.length >= 15}
                onClick={() => images.append({ url: '', alt: '' })}
              >
                + Add image
              </button>
            }
          >
            <p className="muted small">
              https URLs on an allowed host only (Firebase Storage, Google Cloud Storage, Unsplash, Wikimedia). The first image is the cover.
            </p>
            {err('images') && <p className="field-error">{err('images')}</p>}
            <div className="rows">
              {images.fields.map((f, i) => {
                const url = watchedImages?.[i]?.url ?? '';
                return (
                  <div key={f.id} className="row-editor image-row">
                    <div className="image-preview">
                      <SafeImage src={url || undefined} alt={`Preview ${i + 1}`} className="preview" />
                      {i === 0 && <span className="badge badge-teal cover-badge">Cover</span>}
                    </div>
                    <div className="image-fields">
                      <Field label="URL" error={err(`images.${i}.url`)}>
                        <input type="url" inputMode="url" placeholder="https://" {...register(`images.${i}.url` as const)} maxLength={500} />
                      </Field>
                      <Field label="Alt text" error={err(`images.${i}.alt`)}>
                        <input {...register(`images.${i}.alt` as const)} maxLength={140} />
                      </Field>
                    </div>
                    <div className="row-buttons">
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Move up" disabled={i === 0} onClick={() => images.move(i, i - 1)}>↑</button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Move down" disabled={i === images.fields.length - 1} onClick={() => images.move(i, i + 1)}>↓</button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove image ${i + 1}`} onClick={() => images.remove(i)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <aside className="form-side">
          <Section title="Publishing">
            <Field label="Status" error={err('status')}>
              <select {...register('status')}>
                {LISTING_STATUSES.map((s) => (
                  <option key={s} value={s}>{humanize(s)}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Slug"
              error={err('slug')}
              hint={listing ? 'Changing the slug breaks shared links' : 'Generated from the English name'}
            >
              <input {...register('slug', { onChange: () => setSlugTouched(true) })} maxLength={80} spellCheck={false} />
            </Field>
            <label className="checkbox">
              <input type="checkbox" {...register('featured')} /> Featured on the home screen
            </label>
          </Section>

          <Section title="Sponsorship">
            <Field label="Sponsored until" error={err('sponsoredUntil')} hint="Paid placement; shows a “Sponsored” badge until this date. Leave empty for none.">
              <input type="date" {...register('sponsoredUntil')} />
            </Field>
          </Section>

          <Section title="Tags">
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput value={field.value ?? []} onChange={(v) => field.onChange(v)} invalid={Boolean(err('tags'))} />
              )}
            />
            {(err('tags') || (Array.isArray(errors.tags) && errors.tags.find(Boolean)?.message)) && (
              <small className="field-error">{err('tags') ?? (Array.isArray(errors.tags) ? errors.tags.find(Boolean)?.message : '')}</small>
            )}
          </Section>

          <Section title="Contact">
            <Field label="Phone" error={err('contact.phone')}>
              <input type="tel" {...register('contact.phone')} maxLength={20} placeholder="+228 …" />
            </Field>
            <Field label="Email" error={err('contact.email')}>
              <input type="email" {...register('contact.email')} maxLength={254} />
            </Field>
            <Field label="Website" error={err('contact.website')} hint={listing?.contact?.website ? <ExternalLink href={listing.contact.website}>Open current site ↗</ExternalLink> : undefined}>
              <input type="url" {...register('contact.website')} maxLength={500} placeholder="https://" />
            </Field>
            <Field label="Booking URL" error={err('contact.bookingUrl')} hint={listing?.contact?.bookingUrl ? <ExternalLink href={listing.contact.bookingUrl}>Open booking page ↗</ExternalLink> : undefined}>
              <input type="url" {...register('contact.bookingUrl')} maxLength={500} placeholder="https://" />
            </Field>
          </Section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${label.toLowerCase()}?`}
        message={<p>“{listing?.name.en}” will be permanently deleted. This cannot be undone.</p>}
        confirmLabel="Delete permanently"
        danger
        busy={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate()}
      />
    </form>
  );
}
