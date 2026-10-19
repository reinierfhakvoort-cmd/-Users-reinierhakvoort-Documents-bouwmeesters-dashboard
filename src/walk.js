// First-person walking: pointer-lock mouse look, WASD, simple circle-vs-box collisions.
import * as THREE from 'three';
import { EYE } from './plan.js';

const R = 0.22; // body radius

export class Walker {
  constructor(camera, dom, colliders) {
    this.camera = camera; this.colliders = colliders;
    this.yaw = 0; this.pitch = 0; this.keys = new Set();
    this.locked = false;
    dom.addEventListener('click', () => dom.requestPointerLock?.());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      document.getElementById('cross').style.display = this.locked ? 'block' : 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * 0.0022));
      this.apply();
    });
    addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') this.keys.add(e.code); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.syncFromCamera();
  }
  syncFromCamera() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y; this.pitch = e.x;
  }
  apply() { this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); }
  update(dt) {
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!f && !s) return;
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 3.2 : 1.5) * dt;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const dx = (fx * f + -fz * s), dz = (fz * f + fx * s);
    const len = Math.hypot(dx, dz) || 1;
    const p = this.camera.position;
    this.tryMove(p, (dx / len) * speed, 0);
    this.tryMove(p, 0, (dz / len) * speed);
    p.y = EYE;
  }
  tryMove(p, dx, dz) {
    const nx = p.x + dx, nz = p.z + dz;
    for (const b of this.colliders) {
      if (b.max.y < 0.25 || b.min.y > 1.7) continue;
      const cx = Math.max(b.min.x, Math.min(nx, b.max.x)), cz = Math.max(b.min.z, Math.min(nz, b.max.z));
      if ((nx - cx) ** 2 + (nz - cz) ** 2 < R * R) return;
    }
    p.x = nx; p.z = nz;
  }
}
