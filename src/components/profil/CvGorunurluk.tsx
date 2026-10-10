import React from 'react';
import type { CvGizliAlan, StudentProfile } from '../../types';

/**
 * CV'DE NELER GÖRÜNSÜN (20261206010000)
 *
 * Profildeki her bilgi CV'ye zorunlu olarak basılmamalı: telefonunu
 * vermek istemeyen, not ortalamasını yazmak istemeyen öğrenci var.
 * Anahtar KAPALIYKEN bilgi profilde duruyor; yalnız oluşturulan CV'de
 * basılmıyor. Yüklenen PDF'e hiç dokunulmuyor.
 *
 * Profilde olmayan bilgi için anahtar devre dışı: "göster" deyip CV'de
 * hiçbir şey çıkmaması, düğmenin çalışmadığını sandırırdı.
 */

const ALANLAR: { anahtar: CvGizliAlan; etiket: string; var: (s: StudentProfile) => boolean }[] = [
  { anahtar: 'foto', etiket: 'Profil fotoğrafı', var: (s) => Boolean(s.avatarUrl) },
  { anahtar: 'telefon', etiket: 'Telefon', var: (s) => Boolean(s.phone) },
  { anahtar: 'eposta', etiket: 'E-posta', var: (s) => Boolean(s.email) },
  { anahtar: 'konum', etiket: 'Şehir', var: (s) => Boolean(s.city) },
  { anahtar: 'linkedin', etiket: 'LinkedIn', var: (s) => Boolean(s.linkedinUrl) },
  { anahtar: 'portfoy', etiket: 'Portföy bağlantısı', var: (s) => Boolean(s.portfolioUrl) },
  { anahtar: 'not', etiket: 'Not ortalaması', var: (s) => Boolean(s.gpa) || (s.educations ?? []).some((e) => e.gpa != null) },
  { anahtar: 'ilgi', etiket: 'İlgi alanları', var: (s) => (s.interests ?? []).length > 0 },
];

export const CvGorunurluk: React.FC<{
  student: StudentProfile;
  onDegis: (gizli: CvGizliAlan[]) => unknown;
  kilitli?: boolean;
  /** Profil fotoğrafı sosyal profilden de gelebiliyor; çağıran biliyorsa söylüyor. */
  fotografVar?: boolean;
}> = ({ student, onDegis, kilitli = false, fotografVar }) => {
  const gizli = student.cvGizli ?? [];
  return (
    <fieldset>
      <legend className="text-sm font-bold text-gray-900">CV'de neler görünsün?</legend>
      <p className="mt-0.5 text-xs text-gray-600">
        Kapattığın bilgi profilinden silinmez; yalnız oluşturulan CV'de basılmaz.
      </p>
      <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
        {ALANLAR.map((a) => {
          const mevcut = a.anahtar === 'foto' && fotografVar !== undefined ? fotografVar : a.var(student);
          const gorunur = !gizli.includes(a.anahtar);
          const kimlik = `cv-gorunur-${a.anahtar}`;
          return (
            <li key={a.anahtar} className="flex min-h-11 items-center justify-between gap-3">
              <label htmlFor={kimlik} className={`text-sm ${mevcut ? 'text-gray-900' : 'text-gray-400'}`}>
                {a.etiket}
                {!mevcut && <span className="ml-1 text-xs">(profilinde yok)</span>}
              </label>
              <button
                id={kimlik}
                type="button"
                role="switch"
                aria-checked={mevcut && gorunur}
                disabled={kilitli || !mevcut}
                onClick={() =>
                  onDegis(gorunur ? [...gizli, a.anahtar] : gizli.filter((g) => g !== a.anahtar))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                  mevcut && gorunur ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{a.etiket} CV'de görünsün</span>
                <span
                  aria-hidden
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    mevcut && gorunur ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
};
