import type { SystemdUnitDto } from '../../types';

export type SystemdUnitFilter = 'all' | 'active' | 'failed' | 'inactive';

/** Birimleri arama metni ve aktiflik filtresine göre süzer. */
export const filterSystemdUnits = (
  units: SystemdUnitDto[],
  search: string,
  filter: SystemdUnitFilter
): SystemdUnitDto[] => {
  return units.filter((u) => {
    const matchesSearch = search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'active') {
      return u.activeState.toLowerCase() === 'active';
    }
    if (filter === 'failed') {
      return u.activeState.toLowerCase() === 'failed';
    }
    if (filter === 'inactive') {
      return u.activeState.toLowerCase() === 'inactive' || u.activeState.toLowerCase() === 'deactivating';
    }
    return true;
  });
};

/** Belirli bir activeState değerine sahip birim sayısı. */
export const countUnitsByState = (units: SystemdUnitDto[], state: string): number =>
  units.filter((u) => u.activeState.toLowerCase() === state).length;
