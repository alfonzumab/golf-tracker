import { useState, useEffect } from 'react';
import { T } from '../theme';
import { supabase } from '../lib/supabase';

const CourseEditor = ({ courseId, courses, setCourses, onClose }) => {
  const c = courses.find(x => x.id === courseId);
  const [name, setName] = useState(c.name);
  const [city, setCity] = useState(c.city);
  const [tees, setTees] = useState(c.tees);
  const [at, setAt] = useState(0);

  const save = () => {
    const up = courses.map(x => x.id === courseId ? { ...x, name, city, tees } : x);
    setCourses(up); onClose();
  };

  const ut = (f, v) => { const u = [...tees]; u[at] = { ...u[at], [f]: v }; setTees(u); };
  const uh = (f, hi, v) => {
    let val = parseInt(v) || 0;
    if (f === "handicaps") {
      if (val < 0) val = 0;
      if (val > 18) val = 18;
    }
    const u = [...tees]; const a = [...u[at][f]]; a[hi] = val; u[at] = { ...u[at], [f]: a }; setTees(u);
  };

  const addTee = () => {
    const newT = { name: "New Tee", rating: 0, slope: 0, pars: [...tees[0].pars], handicaps: [...tees[0].handicaps] };
    setTees([...tees, newT]); setAt(tees.length);
  };

  const deleteTee = () => {
    if (tees.length === 1) return;
    const u = tees.filter((_, i) => i !== at);
    setTees(u); setAt(Math.max(0, at - 1));
  };

  const tee = tees[at];

  // Check for handicap issues
  const hcpValues = tee.handicaps.filter(h => h > 0);
  const hasDupes = hcpValues.length !== new Set(hcpValues).size;
  const hasOver18 = tee.handicaps.some(h => h > 18);

  return (
    <div className="mbg" onClick={onClose}>
      <div className="mdl" onClick={e => e.stopPropagation()} style={{ maxWidth: "440px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="mdt">Edit Course</div>

        <div className="mb8"><div className="il">Course Name</div>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="mb10"><div className="il">City, State</div>
          <input className="inp" value={city} onChange={e => setCity(e.target.value)} />
        </div>

        <div className="dvd" />

        <div className="fxb mb6">
          <div className="il" style={{ marginBottom: 0 }}>Tees</div>
          <button className="bg" onClick={addTee}>+ Add Tee</button>
        </div>

        <div className="tabs">{tees.map((t, i) => <button key={i} className={`tab ${at === i ? "on" : ""}`} onClick={() => setAt(i)}>{t.name}</button>)}</div>

        <div className="mb8"><div className="il">Tee Name</div>
          <input className="inp" value={tee.name} onChange={e => ut("name", e.target.value)} />
        </div>

        <div className="g2 mb10">
          <div><div className="il">Rating</div>
            <input className="inp" type="number" step="0.1" value={tee.rating || ""} placeholder="72.3" onChange={e => ut("rating", parseFloat(e.target.value) || 0)} />
          </div>
          <div><div className="il">Slope</div>
            <input className="inp" type="number" value={tee.slope || ""} placeholder="135" onChange={e => ut("slope", parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <div style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>Par: {tee.pars.reduce((a, b) => a + b, 0)}</div>

        {(hasDupes || hasOver18) && <div style={{ background: T.red + "18", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, color: T.red }}>
          {hasOver18 && <div>Handicap values must be 1-18.</div>}
          {hasDupes && <div>Each handicap number must be unique.</div>}
        </div>}

        {[{ l: "Front 9", s: 0 }, { l: "Back 9", s: 9 }].map(nine => (
          <div key={nine.l} style={{ marginBottom: 12 }}>
            <div className="il mb6">{nine.l}</div>
            <div className="sw"><table className="sct"><thead><tr>
              <th style={{ minWidth: 36, textAlign: "left", paddingLeft: 4 }}></th>
              {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{nine.s + i + 1}</th>)}
              <th className="tc">Tot</th>
            </tr></thead><tbody>
              <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 12, color: T.dim }}>Par</td>
                {Array.from({ length: 9 }, (_, i) => <td key={i}><input className="si" type="number" value={tee.pars[nine.s + i] || ""} onChange={e => uh("pars", nine.s + i, e.target.value)} /></td>)}
                <td className="tc" style={{ fontSize: 12 }}>{tee.pars.slice(nine.s, nine.s + 9).reduce((a, b) => a + b, 0)}</td>
              </tr>
              <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 12, color: T.dim }}>HCP</td>
                {Array.from({ length: 9 }, (_, i) => <td key={i}><input className="si" type="number" min="1" max="18" value={tee.handicaps[nine.s + i] || ""} onChange={e => uh("handicaps", nine.s + i, e.target.value)} /></td>)}
                <td />
              </tr>
            </tbody></table></div>
          </div>
        ))}

        {tees.length > 1 && <button className="btn bd mb10" onClick={deleteTee}>Delete This Tee</button>}

        <div className="fx g8">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" disabled={hasDupes || hasOver18} onClick={save}>Save Course</button>
        </div>
      </div>
    </div>
  );
};

const Courses = ({ courses, setCourses, selectedCourseId, setSelectedCourseId, isAdmin }) => {
  const [edit, setEdit] = useState(null);
  const [inactive, setInactive] = useState([]);

  // Load inactive courses for admin view
  useEffect(() => {
    if (!isAdmin) return;
    const loadInactive = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', false)
        .order('name');
      if (!error && data) {
        setInactive(data.map(c => ({ id: c.id, name: c.name, city: c.city, tees: c.tees })));
      }
    };
    loadInactive();
  }, [isAdmin]);

  const addCourse = () => {
    const newC = {
      id: Date.now().toString(),
      name: "New Course",
      city: "City, State",
      tees: [{ name: "White", rating: 0, slope: 0, pars: Array(18).fill(4), handicaps: Array.from({ length: 18 }, (_, i) => i + 1) }]
    };
    const up = [...courses, newC];
    setCourses(up);
    setEdit(newC.id);
  };

  const deleteCourse = async id => {
    // Soft delete: set is_active = false
    const { error } = await supabase.from('courses').update({ is_active: false }).eq('id', id);
    if (error) {
      console.error('Failed to delete course:', error);
      return;
    }
    const up = courses.filter(c => c.id !== id);
    setCourses(up);
    setInactive([...inactive, courses.find(c => c.id === id)]);
    if (selectedCourseId === id) { setSelectedCourseId(up[0]?.id || null); }
  };

  return (
    <div className="pg">
      <div className="fxb mb10">
        <span className="pg-title">Courses</span>
        {isAdmin && <button className="btn bp bsm" onClick={addCourse}>+ Add Course</button>}
      </div>

      {courses.length === 0 && (
        <div className="empty">
          <div className="empty-i">{"\u26F3"}</div>
          <div className="empty-t">No courses yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Add a course to start playing rounds</div>
        </div>
      )}

      {courses.map(c => (
        <div key={c.id} className="prow">
          <div style={{ flex: 1 }}>
            <div className="prow-n">{c.name}</div>
            <div className="prow-i">{c.city} {"\u00B7"} {c.tees.length} tee{c.tees.length !== 1 ? "s" : ""}</div>
          </div>
          {isAdmin && (
            <>
              <button className="bg" onClick={() => setEdit(c.id)}>Edit</button>
              <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => deleteCourse(c.id)}>Delete</button>
            </>
          )}
        </div>
      ))}

      {isAdmin && inactive.length > 0 && (
        <>
          <div className="dvd" />
          <div className="mb10" style={{ fontSize: 14, color: T.dim, fontWeight: 600 }}>Inactive Courses</div>
          {inactive.map(c => (
            <div key={c.id} className="prow" style={{ opacity: 0.6 }}>
              <div style={{ flex: 1 }}>
                <div className="prow-n">{c.name}</div>
                <div className="prow-i">{c.city} {"\u00B7"} {c.tees.length} tee{c.tees.length !== 1 ? "s" : ""}</div>
              </div>
              <button className="btn bg bsm" onClick={async () => {
                await supabase.from('courses').update({ is_active: true }).eq('id', c.id);
                setInactive(inactive.filter(ic => ic.id !== c.id));
                // Reload active courses
                const { data } = await supabase.from('courses').select('*').eq('is_active', true).order('name');
                if (data) {
                  const activeCourses = data.map(ac => ({ id: ac.id, name: ac.name, city: ac.city, tees: ac.tees }));
                  setCourses(activeCourses);
                }
              }}>Restore</button>
            </div>
          ))}
        </>
      )}

      {edit && <CourseEditor courseId={edit} courses={courses} setCourses={setCourses} onClose={() => setEdit(null)} />}
    </div>
  );
};

export default Courses;
