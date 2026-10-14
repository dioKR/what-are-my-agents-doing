// 오른쪽 위 톱니바퀴 설정 창. 열고 닫기는 <details>가 하고, 여기서는 바깥을 누르거나 Esc를 누르면 닫히게만 한다.
export function closeSettingsOnClickAwayOrEscape(menu: HTMLDetailsElement): void {
  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  });
}
