/* The Free vs Premium table promises a "special lifetime price for early adopters".
 * This makes that promise real without adding a fourth plan to the sheet: while
 * founding places remain, the existing Lifetime button carries the founding price
 * and sends the founding plan code. When the places run out it says nothing, and
 * the button goes back to what the page was authored with.
 *
 * Kept out of the app's own script so the design and its code stay untouched.
 */
(function () {
  if (!/^https?:$/.test(location.protocol)) return;

  function apply(info) {
    if (!info || !info.left) return;
    var btn = document.querySelector('.pw-plan[data-plan="life"]');
    if (!btn || btn.dataset.founding) return;

    // the app resolves a clicked button through PRICES[dataset.plan]
    if (window.PRICES && !window.PRICES.founding) {
      window.PRICES.founding = {
        label: 'Lifetime · Founding Member',
        amt: info.amount,
        cycle: 'once',
        sub: 'one payment, yours for good',
      };
    }
    btn.dataset.founding = '1';
    btn.dataset.plan = 'founding';

    var price = btn.querySelector('.pp-v');
    var note = btn.querySelector('.pp-d');
    if (price) price.textContent = 'RM' + info.amount;
    if (note) note.textContent = 'Founding Member · ' + info.left.toLocaleString() + ' of ' + info.seats.toLocaleString() + ' places left';
  }

  function load() {
    fetch('/api/pay/offer', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) apply(d.founding); })
      .catch(function () { /* the authored price stands */ });
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', load);
  else load();
})();
