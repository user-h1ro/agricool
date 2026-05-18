import { useFormContext } from 'react-hook-form';
import { CATEGORY_THEME, UNIT_OPTIONS } from '../types';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import { LuFacebook, LuMapPin, LuHouse, LuNavigation, LuSprout, LuUser } from 'react-icons/lu';

const CROP_OPTIONS: Record<string, string[]> = {
  leafy: ['Pechay', 'Kangkong', 'Lettuce', 'Spinach', 'Mustard'],
  fruit_veg: ['Tomato', 'Eggplant', 'Okra', 'Ampalaya', 'Squash'],
  rootcrops: ['Potato', 'Carrot', 'Sweet Potato', 'Radish', 'Ginger'],
  fruits: ['Banana', 'Mango', 'Papaya', 'Pineapple'],
  herbs: ['Basil', 'Parsley', 'Spring Onion'],
};

const styles = `
  /* ── Global form styles ─────────────────────────── */
  .ff-wrap {
    padding: 0;
    font-family: 'Georgia', serif;
  }

  /* ── Section header ─────────────────────────────── */
  .ff-section {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 18px 20px 10px 20px;
  }
  .ff-section-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .ff-section-icon.green {
    background: #d4edcc;
    color: #2d4a1e;
  }
  .ff-section-icon.amber {
    background: #fde8bb;
    color: #8a5e1a;
  }
  .ff-section-icon.blue-grey {
    background: #dde6ed;
    color: #2a4a5e;
  }
  .ff-section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6a5840;
  }
  .ff-section-line {
    flex: 1;
    height: 1px;
    background: #ddd5c0;
  }

  /* ── Field container ─────────────────────────────── */
  .ff-fields {
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ff-row {
    display: flex;
    gap: 12px;
  }
  .ff-row > * {
    flex: 1;
    min-width: 0;
  }

  /* ── Label ─────────────────────────────────────── */
  .ff-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #4a3820;
    margin-bottom: 5px;
    letter-spacing: 0.03em;
  }
  .ff-label .req {
    color: #c0392b;
    margin-left: 2px;
  }
  .ff-hint {
    font-size: 11px;
    color: #9a8870;
    margin-top: 4px;
    line-height: 1.4;
  }

  /* ── Input / Select / Textarea ─────────────────── */
  .ff-input,
  .ff-select {
    width: 100%;
    border: 1.5px solid #cfc2a8;
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 13.5px;
    color: #2d1f0a;
    background: #fffdf7;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    font-family: 'Georgia', serif;
  }
  .ff-input::placeholder {
    color: #b8a888;
    font-style: italic;
  }
  .ff-input:focus,
  .ff-select:focus {
    border-color: #3a5f28;
    box-shadow: 0 0 0 3px rgba(58, 95, 40, 0.1);
    background: #fff;
  }
  .ff-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%236a5840' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 18px;
    padding-right: 34px;
    cursor: pointer;
  }
  .ff-input-icon-wrap {
    position: relative;
  }
  .ff-input-icon-wrap .ff-input {
    padding-left: 38px;
  }
  .ff-input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #8a7a60;
    pointer-events: none;
    display: flex;
    align-items: center;
  }

  /* ── Category pills ─────────────────────────────── */
  .ff-category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ff-cat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    border: 1.5px solid #cfc2a8;
    border-radius: 10px;
    background: #fffdf7;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Georgia', serif;
    font-size: 12px;
    color: #5a4830;
    font-weight: 600;
  }
  .ff-cat-pill:hover {
    border-color: #a89070;
    background: #f7f0e0;
  }
  .ff-cat-pill.active {
    border-color: #3a5f28;
    background: #e8f5e1;
    color: #243d17;
    box-shadow: 0 0 0 2px rgba(58, 95, 40, 0.15);
  }
  .ff-cat-emoji {
    font-size: 20px;
    line-height: 1;
  }
  .ff-cat-name {
    font-size: 10.5px;
    text-align: center;
    line-height: 1.2;
  }

  /* ── Divider ─────────────────────────────────────── */
  .ff-divider {
    height: 1px;
    background: #e0d8c8;
    margin: 4px 0;
  }

  /* ── Location buttons ─────────────────────────────── */
  .ff-loc-btns {
    display: flex;
    gap: 10px;
  }
  .ff-loc-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    font-family: 'Georgia', serif;
  }
  .ff-loc-btn.gps {
    background: #243d17;
    color: #fff;
    box-shadow: 0 2px 8px rgba(36,61,23,0.3);
  }
  .ff-loc-btn.gps:hover {
    background: #2d4a1e;
    box-shadow: 0 4px 12px rgba(36,61,23,0.38);
    transform: translateY(-1px);
  }
  .ff-loc-btn.farm {
    background: #f0e0b8;
    color: #6a4818;
    border: 1.5px solid #d4b880;
  }
  .ff-loc-btn.farm:hover {
    background: #e8d4a0;
    transform: translateY(-1px);
  }
  .ff-loc-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  /* ── Map container ─────────────────────────────── */
  .ff-map-wrap {
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #cfc2a8;
    box-shadow: 0 3px 12px rgba(0,0,0,0.08);
    position: relative;
  }
  .ff-map-overlay {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,253,247,0.92);
    border: 1px solid #cfc2a8;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 11px;
    color: #6a5840;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 999;
    pointer-events: none;
  }

  /* ── Bottom spacing ─────────────────────────────── */
  .ff-bottom-pad {
    height: 8px;
  }
`;

const FormFields = () => {
  const { register, watch, setValue } = useFormContext();
  const { user } = useAuth();
  const category = watch('category');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([14.6760, 121.0437], 13);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setValue('latitude', lat);
      setValue('longitude', lng);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup('📍 Listing Location')
        .openPopup();
    });
  }, []);

  const useDefaultLocation = async () => {
    if (!user) return alert('Please log in first');
    setLoadingDefault(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('farm_name, default_location, default_latitude, default_longitude')
        .eq('id', user.id)
        .single();
      if (error || !data?.default_latitude || !data?.default_longitude) {
        alert('No default location saved. Please set it in Profile page first.');
        return;
      }
      const { default_latitude, default_longitude, default_location, farm_name } = data;
      setValue('latitude', default_latitude);
      setValue('longitude', default_longitude);
      setValue('location', default_location || '');
      setValue('seller', farm_name || '');
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([default_latitude, default_longitude], 16);
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([default_latitude, default_longitude])
          .addTo(mapInstanceRef.current)
          .bindPopup('📍 Default Farm Location')
          .openPopup();
      }
      alert('✅ Default farm location loaded!');
    } catch {
      alert('Failed to load default location');
    } finally {
      setLoadingDefault(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16);
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = L.marker([latitude, longitude])
            .addTo(mapInstanceRef.current)
            .bindPopup('📍 Your Current Location')
            .openPopup();
        }
        alert(`✅ Pinned at: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => alert('❌ Could not get your location. Please allow permission.')
    );
  };

  return (
    <div className="ff-wrap">
      <style>{styles}</style>

      {/* ── CROP DETAILS ─────────────────────────────── */}
      <div className="ff-section">
        <div className="ff-section-icon green">
          <LuSprout size={15} />
        </div>
        <span className="ff-section-label">Crop Details</span>
        <div className="ff-section-line" />
      </div>

      <div className="ff-fields">

        {/* Category pills */}
        <div>
          <label className="ff-label">Crop Category <span className="req">*</span></label>
          <div className="ff-category-grid">
            {Object.entries(CATEGORY_THEME).map(([key, val]) => (
              <button
                key={key}
                type="button"
                className={`ff-cat-pill ${category === key ? 'active' : ''}`}
                onClick={() => setValue('category', key)}
              >
                <span className="ff-cat-emoji">{val.emoji}</span>
                <span className="ff-cat-name">{val.label}</span>
              </button>
            ))}
          </div>
          {/* hidden input to register value */}
          <input type="hidden" {...register('category', { required: true })} />
        </div>

        {/* Specific Crop */}
        <div>
          <label className="ff-label">Specific Crop <span className="req">*</span></label>
          <select className="ff-select" {...register('name', { required: true })}>
            <option value="">Select crop…</option>
            {(CROP_OPTIONS[category] || []).map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
        </div>

        {/* Variety + Quantity */}
        <div className="ff-row">
          <div>
            <label className="ff-label">Variety</label>
            <input
              className="ff-input"
              placeholder="e.g. Native, Hybrid"
              {...register('variety')}
            />
          </div>
          <div>
            <label className="ff-label">Quantity <span className="req">*</span></label>
            <input
              className="ff-input"
              placeholder="e.g. 5kg, 20pcs"
              {...register('quantity', { required: true })}
            />
          </div>
        </div>

        {/* Price + Unit */}
        <div className="ff-row">
          <div>
            <label className="ff-label">Price (₱) <span className="req">*</span></label>
            <input
              type="number"
              className="ff-input"
              placeholder="45"
              {...register('price', { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="ff-label">Unit</label>
            <select className="ff-select" {...register('unit')}>
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

      </div>

      {/* ── LOCATION ─────────────────────────────────── */}
      <div className="ff-section" style={{ marginTop: 10 }}>
        <div className="ff-section-icon amber">
          <LuMapPin size={14} />
        </div>
        <span className="ff-section-label">Location</span>
        <div className="ff-section-line" />
      </div>

      <div className="ff-fields">

        <div>
          <label className="ff-label">Address <span className="req">*</span></label>
          <input
            className="ff-input"
            placeholder="Brgy. Commonwealth, Quezon City"
            {...register('location', { required: true })}
          />
        </div>

        {/* Location buttons */}
        <div className="ff-loc-btns">
          <button type="button" className="ff-loc-btn gps" onClick={getCurrentLocation}>
            <LuNavigation size={13} /> Use Current Location
          </button>
          <button
            type="button"
            className="ff-loc-btn farm"
            onClick={useDefaultLocation}
            disabled={loadingDefault}
          >
            <LuHouse size={13} />
            {loadingDefault ? 'Loading…' : 'Use Default Farm'}
          </button>
        </div>

        {/* Mini Map */}
        <div className="ff-map-wrap">
          <div ref={mapRef} style={{ width: '100%', height: '230px' }} />
          <div className="ff-map-overlay">
            <LuMapPin size={11} /> Tap map to pin your exact location
          </div>
        </div>

        <input type="hidden" {...register('latitude')} />
        <input type="hidden" {...register('longitude')} />

      </div>

      {/* ── SELLER INFO ─────────────────────────────── */}
      <div className="ff-section" style={{ marginTop: 10 }}>
        <div className="ff-section-icon blue-grey">
          <LuUser size={14} />
        </div>
        <span className="ff-section-label">Seller Info</span>
        <div className="ff-section-line" />
      </div>

      <div className="ff-fields">

        {/* Facebook */}
        <div>
          <label className="ff-label">
            Facebook Name / Link <span className="req">*</span>
          </label>
          <div className="ff-input-icon-wrap">
            <span className="ff-input-icon" style={{ color: '#1877f2' }}>
              <LuFacebook size={15} />
            </span>
            <input
              className="ff-input"
              placeholder="e.g. JuanDelaCruzFarm or facebook.com/yourpage"
              {...register('facebook', { required: true })}
            />
          </div>
          <p className="ff-hint">Buyers will contact you through this. Enter your FB username, page name, or profile URL.</p>
        </div>

        {/* Farm / Seller Name */}
        <div>
          <label className="ff-label">Your Name / Farm Name</label>
          <input
            className="ff-input"
            placeholder="e.g. Mang Mario's Farm"
            {...register('seller')}
          />
        </div>

      </div>

      <div className="ff-bottom-pad" />
    </div>
  );
};

export default FormFields;