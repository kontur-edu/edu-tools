export function toShow(fio: string) {
  return fio.replace(/ё/g, 'е').replace(/[ ]+/g, ' ');
}

export function toKey(fio: string) {
  return fio.toLowerCase().replace(/ё/g, 'е').replace(/[ ]+/g, ' ').trim();
}
