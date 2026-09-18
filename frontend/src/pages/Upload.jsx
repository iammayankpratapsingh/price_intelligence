import { useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import Badge from '../components/Badge.jsx';
import FilterChips from '../components/FilterChips.jsx';
import PartsTable from '../components/PartsTable.jsx';
import { useApi, useIntro } from '../lib/useApi.js';
import { uploadFile, publishUpload, discardUpload } from '../lib/api.js';
import { fmt, fmtInt, pctText } from '../lib/format.js';

const LIMIT = 300;

/** Drop zone / file picker. Also the resting state of the screen. */
function DropZone({ onFile, catalogLine, error }) {
  const input = useRef(null);
  const [hover, setHover] = useState(false);

  const pick = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <>
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); pick(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        style={{
          border: `1.5px dashed ${hover ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: hover ? 'var(--red-bg)' : 'var(--surface)',
          backgroundImage:
            'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          transition: 'border-color .15s, background-color .2s',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
        />
        <div
          style={{
            width: 72, height: 88, margin: '0 auto 20px', borderRadius: 8, background: 'var(--surface)',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)', display: 'grid',
            placeItems: 'center', color: 'var(--red)', position: 'relative',
          }}
        >
          <Icon name="file" size={34} strokeWidth={1.6} />
          <div
            style={{
              position: 'absolute', bottom: -8, right: -14, padding: '2px 7px', borderRadius: 4,
              background: 'var(--nav)', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: '.04em',
            }}
          >
            XLSX
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Drop the MRP price list here</div>
        <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
          .xlsx, .xls or .csv · up to 50 MB · columns detected automatically
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', marginTop: 20,
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
            fontWeight: 500, fontSize: 13,
          }}
        >
          Choose file
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            maxWidth: 760, margin: '16px auto 0', padding: '12px 16px', borderRadius: 10,
            background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          maxWidth: 760, margin: '16px auto 0', display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', gap: 8,
        }}
      >
        <span>
          Will be compared against: <span style={{ color: 'var(--text)', fontWeight: 500 }}>{catalogLine}</span>
        </span>
        <span>Expected columns: PART_NUM, ROOT_PART_NUM, PART_DESC, MRP, TAX_DESC, HS_CODE</span>
      </div>
    </>
  );
}

/** Progress card shown while the server parses the workbook. */
function Processing({ file, progress }) {
  const pct = Math.round(progress);
  const steps = [['Reading sheets', 0], ['Matching part numbers', 35], ['Computing deltas', 75]].map(
    ([label, at]) => ({
      label,
      color: pct >= at ? (pct >= at + 35 || pct >= 100 ? 'var(--green)' : 'var(--red)') : 'var(--faint)',
    }),
  );

  return (
    <Card style={{ maxWidth: 760, margin: '0 auto' }} padding={32}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 10, background: 'var(--red-bg)',
            color: 'var(--red)', display: 'grid', placeItems: 'center', flex: 'none',
          }}
        >
          <Icon name="file" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{file?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {(file?.size / 1024 / 1024).toFixed(1)} MB · reading sheets
          </div>
        </div>
        <div className="num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}>{pct}%</div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', marginTop: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)', borderRadius: 3, transition: 'width .12s linear' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginTop: 16 }}>
        {steps.map((s) => (
          <div key={s.label} style={{ fontSize: 12, color: s.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flex: 'none' }} />
            {s.label}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 70px', gap: 16 }}>
            {[0, 1, 2, 3, 4].map((c) => <div key={c} className="skel" style={{ height: 12 }} />)}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Ranked top-5 movers, shown either side of the full diff. */
function RankedList({ title, sym, color, items, isMobile }) {
  const navigate = useNavigate();
  return (
    <Card padding={isMobile ? 18 : 24} style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color }}>
        <span>{sym}</span>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {items.map((r) => (
          <div
            key={r.partNo}
            onClick={() => navigate(`/part/${encodeURIComponent(r.partNo)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/part/${encodeURIComponent(r.partNo)}`)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
              padding: '8px 0', borderTop: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <div style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{r.partNo}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{r.desc}</span>
            </div>
            <div className="num" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, whiteSpace: 'nowrap' }}>
              {!isMobile && <span style={{ color: 'var(--muted)' }}>{fmt(r.prev)}</span>}
              {!isMobile && <span style={{ fontWeight: 600 }}>{fmt(r.cur)}</span>}
              <span style={{ minWidth: 56, textAlign: 'right', fontWeight: 600, color }}>{pctText(r)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Upload() {
  const { isMobile } = useOutletContext();
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'delta', dir: 'desc' });
  // An upload is previewed first; it only becomes the current price list once
  // it is published, so a wrong file can be discarded before it does harm.
  const [publishedRev, setPublishedRev] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Until something is uploaded, the screen shows the workbook's own comparison.
  const { data: compare } = useApi('/compare');
  const { data: catalogDiff } = useApi(
    `/parts?filter=${filter}&sortKey=${sort.key}&sortDir=${sort.dir}&limit=${LIMIT}&excludeDropped=1`,
    { skip: stage !== 'done' || Boolean(uploadResult) },
  );
  const t = useIntro(900, [stage, uploadResult]);

  async function handleFile(picked) {
    setFile(picked);
    setError('');
    setStage('processing');
    setProgress(0);

    // The upload itself is only the first slice of the bar; parsing follows.
    let timer = null;
    try {
      const result = await uploadFile(picked, (p) => setProgress(Math.min(60, p * 0.6)));
      timer = setInterval(() => setProgress((p) => Math.min(96, p + 4)), 60);
      clearInterval(timer);
      setProgress(100);
      setUploadResult(result);
      setTimeout(() => setStage('done'), 300);
    } catch (err) {
      if (timer) clearInterval(timer);
      setError(err.message || 'That file could not be processed.');
      setStage('idle');
      setFile(null);
    }
  }

  const reset = () => {
    setStage('idle');
    setUploadResult(null);
    setFile(null);
    setProgress(0);
    setError('');
    setPublishedRev(null);
    setPublishing(false);
  };

  /** Commits the previewed upload: its prices become the current ones. */
  const publish = async () => {
    if (!uploadResult?.pendingId || publishing) return;
    setPublishing(true);
    setError('');
    try {
      const res = await publishUpload(uploadResult.pendingId);
      setPublishedRev(res.revision);
    } catch (err) {
      setError(err.message || 'Could not publish this list.');
    } finally {
      setPublishing(false);
    }
  };

  /** Throws the preview away. Nothing was written, so there is nothing to undo. */
  const discard = async () => {
    if (uploadResult?.pendingId) {
      try { await discardUpload(uploadResult.pendingId); } catch { /* already gone */ }
    }
    reset();
  };

  const showWorkbookDiff = () => {
    setUploadResult(null);
    setFile(null);
    setStage('done');
  };

  const view = useMemo(() => {
    if (uploadResult) {
      return {
        counts: uploadResult.counts,
        matched: uploadResult.matched,
        topUp: uploadResult.topUp,
        topDown: uploadResult.topDown,
        doneLine: publishedRev
          ? `${uploadResult.file.name} published as the current price list · revision ${publishedRev.seq}`
          : `${uploadResult.file.name} · ${fmtInt(uploadResult.parts)} parts read · nothing saved yet`,
        rows: uploadResult.diff,
        clientFiltered: true,
      };
    }
    if (!compare) return null;
    return {
      counts: compare.counts,
      matched: compare.matched,
      topUp: compare.topUp,
      topDown: compare.topDown,
      doneLine: `mrp solution.xlsx parsed · ${fmtInt(compare.priced[2])} parts read · compared against the revised list · saved as revision 3`,
      rows: catalogDiff?.rows || [],
      total: catalogDiff?.total ?? 0,
      clientFiltered: false,
    };
  }, [uploadResult, compare, catalogDiff, publishedRev]);

  // An uploaded diff arrives whole, so filter and sort it in the browser.
  const rows = useMemo(() => {
    if (!view) return [];
    if (!view.clientFiltered) return view.rows;
    let list = view.rows.filter((r) => (filter === 'all' ? r.status !== 'dropped' : r.status === filter));
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = (r) =>
      sort.key === 'pct' ? (r.pct ?? -1e9 * dir)
        : sort.key === 'delta' ? (r.delta == null ? -1e9 * dir : Math.abs(r.delta))
          : sort.key === 'old' ? (r.prev ?? -1)
            : sort.key === 'new' ? (r.cur ?? -1)
              : r[sort.key];
    return list.slice().sort((a, b) => {
      const x = key(a); const y = key(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    }).slice(0, LIMIT);
  }, [view, filter, sort]);

  const total = view?.clientFiltered ? rows.length : view?.total ?? 0;
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1240, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px,4vw,24px)', fontWeight: 600, letterSpacing: '-.01em' }}>
          Upload &amp; compare
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
          New MRP lists are matched by part number against the current revision. Nothing is overwritten;
          every version is kept.
        </p>
      </div>

      {stage === 'idle' && (
        <>
          <DropZone
            onFile={handleFile}
            error={error}
            catalogLine={compare ? `09 Aug 2026 list · ${fmtInt(compare.priced[2])} parts` : 'the current revision'}
          />
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              type="button"
              onClick={showWorkbookDiff}
              style={{ border: 'none', background: 'none', color: 'var(--red)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
            >
              Or review the existing comparison →
            </button>
          </div>
        </>
      )}

      {stage === 'processing' && <Processing file={file} progress={progress} />}

      {stage === 'done' && view && (
        <>
          {uploadResult && !publishedRev ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10,
                background: 'var(--blue-bg)', color: 'var(--blue)', fontSize: 13,
                marginBottom: 20, flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Check this before saving</div>
                <div style={{ opacity: 0.85 }}>{view.doneLine}</div>
              </div>
              <button
                type="button"
                onClick={discard}
                disabled={publishing}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13,
                  cursor: publishing ? 'default' : 'pointer',
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={publishing}
                style={{
                  height: 36, padding: '0 16px', borderRadius: 8, border: 'none',
                  background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.7 : 1,
                }}
              >
                {publishing ? 'Saving…' : 'Save as current prices'}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
                background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 500, fontSize: 13,
                marginBottom: 20, flexWrap: 'wrap',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flex: 'none' }} />
              {view.doneLine}
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={reset}
                style={{ border: 'none', background: 'none', color: 'var(--green)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Upload another
              </button>
            </div>
          )}

          {error && stage === 'done' && (
            <div
              role="alert"
              style={{
                padding: '10px 14px', borderRadius: 8, background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 13, marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16, marginBottom: 24,
            }}
          >
            {[
              { label: 'Matched parts', value: view.matched, color: 'var(--text)' },
              { label: '▲ Increased', value: view.counts.up, color: 'var(--red)' },
              { label: '▼ Decreased', value: view.counts.down, color: 'var(--green)' },
              { label: '— Unchanged', value: view.counts.same, color: 'var(--muted)' },
              { label: '● New parts', value: view.counts.new, color: 'var(--blue)' },
            ].map((s) => (
              <Card key={s.label} padding="18px 20px" style={{ borderTop: `3px solid ${s.color}` }}>
                <div
                  style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '.02em',
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="num"
                  style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', marginTop: 6, color: s.color }}
                >
                  {fmtInt(s.value * t)}
                </div>
              </Card>
            ))}
          </div>

          <div
            style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16, marginBottom: 24,
            }}
          >
            <RankedList title="Biggest increases (%)" sym="▲" color="var(--red)" items={view.topUp} isMobile={isMobile} />
            <RankedList title="Biggest decreases (%)" sym="▼" color="var(--green)" items={view.topDown} isMobile={isMobile} />
          </div>

          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
                borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
                overflowX: isMobile ? 'auto' : 'visible',
              }}
            >
              <div style={{ fontWeight: 600, marginRight: 8 }}>Full diff</div>
              <FilterChips value={filter} onChange={setFilter} height={28} />
              <span style={{ flex: 1 }} />
              <span className="num" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {total >= LIMIT ? `showing ${LIMIT} of ${fmtInt(view.clientFiltered ? view.rows.length : total)} rows` : `${fmtInt(total)} rows`}
              </span>
            </div>
            <PartsTable
              rows={rows}
              isMobile={isMobile}
              variant="diff"
              sortKey={sort.key}
              sortDir={sort.dir}
              onSort={onSort}
              maxHeight={isMobile ? '60dvh' : 520}
              emptyTitle="No rows for this filter"
            />
          </Card>
        </>
      )}
    </div>
  );
}
