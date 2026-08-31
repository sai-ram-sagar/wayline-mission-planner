import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_MAP_VIEW } from '../constants';

/**
 * Waypoint pins are divIcons rather than Leaflet's default sprite: the sprite's
 * image paths break under bundlers, and a numbered badge reads far better on a
 * dense route. Styling lives in index.css.
 */
function waypointIcon(index, { selected, isStart }) {
  const classes = ['wp-marker-inner'];
  if (selected) classes.push('is-selected');
  if (isStart) classes.push('is-start');
  return L.divIcon({
    className: 'wp-marker',
    html: `<div class="${classes.join(' ')}">${isStart ? 'S' : index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const takeoffIcon = L.divIcon({
  className: 'wp-marker',
  html: '<div class="takeoff-marker-inner">H</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * Re-measures the container, but only once it actually has layout.
 *
 * Leaflet caches the container size at construction. If the map mounts into a
 * container that is still 0x0 — a hidden panel, or a flex layout that has not
 * resolved yet — a later invalidateSize sees the size grow from zero and pans
 * the view by half the difference, which is half the container: every tile and
 * marker ends up visibly offset. Skipping the call while the container has no
 * size avoids that, and keeps Leaflet's normal centre-preserving pan for real
 * resizes such as the inspector panel opening.
 */
function resizeIfLaidOut(map) {
  const element = map.getContainer();
  if (!element.clientWidth || !element.clientHeight) return false;
  map.invalidateSize({ animate: false });
  return true;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/**
 * Fits the map to `bounds` whenever `fitToken` changes. The token lets the
 * parent say "fit now" (on load, or when the user presses Fit) without the map
 * fighting the user every time a marker moves.
 */
function FitBounds({ points, fitToken }) {
  const map = useMap();

  useEffect(() => {
    if (fitToken === null || fitToken === undefined) return undefined;
    if (!points.length) return undefined;

    // Fit on the next frame, after re-measuring the container. Leaflet derives
    // the zoom from map.getSize(); if the flex layout has changed (the
    // inspector opening, or a fresh mount) that cached size is stale and
    // fitBounds lands on the wrong zoom.
    const frame = requestAnimationFrame(() => {
      resizeIfLaidOut(map);
      if (points.length === 1) {
        map.setView(points[0], Math.max(map.getZoom(), 17));
        return;
      }
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 18 });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Keeps Leaflet's internal size in step with a container that can be resized. */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => resizeIfLaidOut(map);
    // Once after the first frame, in case the flex layout had not settled when
    // Leaflet measured the container, then on every subsequent resize.
    const frame = requestAnimationFrame(invalidate);
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

export default function MapCanvas({
  waypoints,
  takeoffPoint,
  selectedKey,
  onMapClick,
  onWaypointClick,
  onWaypointDragEnd,
  fitToken,
  interactionHint,
}) {
  const linePositions = useMemo(() => waypoints.map((w) => [w.lat, w.lng]), [waypoints]);

  const fitPoints = useMemo(() => {
    const points = waypoints.map((w) => [w.lat, w.lng]);
    if (takeoffPoint) points.push([takeoffPoint.lat, takeoffPoint.lng]);
    return points;
  }, [waypoints, takeoffPoint]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[DEFAULT_MAP_VIEW.lat, DEFAULT_MAP_VIEW.lng]}
        zoom={DEFAULT_MAP_VIEW.zoom}
        className="h-full w-full"
        zoomControl
        // Double-click zoom fights click-to-add on a dense route.
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <ClickHandler onMapClick={onMapClick} />
        <ResizeWatcher />
        <FitBounds points={fitPoints} fitToken={fitToken} />

        {linePositions.length > 1 && (
          <Polyline
            positions={linePositions}
            pathOptions={{ color: '#38bdf8', weight: 3, opacity: 0.9 }}
          />
        )}

        {takeoffPoint && (
          <Marker position={[takeoffPoint.lat, takeoffPoint.lng]} icon={takeoffIcon} />
        )}

        {waypoints.map((waypoint, index) => (
          <Marker
            key={waypoint.key}
            position={[waypoint.lat, waypoint.lng]}
            icon={waypointIcon(index, {
              selected: waypoint.key === selectedKey,
              isStart: index === 0,
            })}
            draggable
            eventHandlers={{
              click: () => onWaypointClick?.(waypoint.key),
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                onWaypointDragEnd?.(waypoint.key, { lat, lng });
              },
            }}
          />
        ))}
      </MapContainer>

      {interactionHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded
                        bg-panel-900/90 px-3 py-1.5 text-xs text-slate-200 shadow-lg ring-1 ring-panel-500">
          {interactionHint}
        </div>
      )}
    </div>
  );
}
