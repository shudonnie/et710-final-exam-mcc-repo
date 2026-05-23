import { Component, ViewEncapsulation, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.html',
  styles: []
})
export class App implements AfterViewInit {
  ngAfterViewInit(): void {

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
    const fmtShort = (n: number) => {
      if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
      if (n >= 1e3) return '$' + Math.round(n/1000) + 'K';
      return '$' + Math.round(n);
    };

    function fv(pv: number, rate: number, n: number, pmt: number): number {
      const r = rate / 100;
      if (r === 0) return pv + pmt * n;
      return pv * Math.pow(1+r, n) + pmt * ((Math.pow(1+r,n)-1)/r);
    }

    function eligibility(income: number, filing: string) {
      const limits: any = {
        single: { full: 150000, out: 165000 },
        joint:  { full: 236000, out: 246000 }
      };
      const l = limits[filing];
      if (income <= l.full) return { status: 'full', label: '✓ Full contribution eligible' };
      if (income >= l.out)  return { status: 'none', label: '✗ Over limit — consider Backdoor Roth' };
      return { status: 'partial', label: '~ Partial contribution eligible' };
    }

    let delayVisible = true;

    document.getElementById('toggle-label')!.addEventListener('click', () => {
      delayVisible = !delayVisible;
      document.getElementById('delay-toggle')!.classList.toggle('on', delayVisible);
      document.getElementById('delay-body')!.style.display = delayVisible ? 'grid' : 'none';
    });

    const html = document.documentElement;
    const toggleBtn = document.getElementById('dark-toggle')!;
    const darkIcon = document.getElementById('dark-icon')!;
    const darkLabel = document.getElementById('dark-label')!;

    function setDark(on: boolean) {
      html.classList.toggle('dark', on);
      darkIcon.textContent = on ? '☀️' : '🌙';
      darkLabel.textContent = on ? 'Light' : 'Dark';
      try { localStorage.setItem('riq-dark', on ? '1' : '0'); } catch(e) {}
    }

    toggleBtn.addEventListener('click', () => setDark(!html.classList.contains('dark')));

    try {
      const saved = localStorage.getItem('riq-dark');
      if (saved !== null) setDark(saved === '1');
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDark(true);
    } catch(e) {}

    function calc() {
      const age     = +(document.getElementById('s-age') as HTMLInputElement).value;
      const ret     = +(document.getElementById('s-ret') as HTMLInputElement).value;
      const contrib = +(document.getElementById('s-contrib') as HTMLInputElement).value;
      const bal     = +(document.getElementById('s-bal') as HTMLInputElement).value;
      const rate    = +(document.getElementById('s-rate') as HTMLInputElement).value;
      const tax     = +(document.getElementById('s-tax') as HTMLInputElement).value;
      const income  = +(document.getElementById('s-income') as HTMLInputElement).value;
      const filing  = (document.getElementById('s-filing') as HTMLSelectElement).value;

      document.getElementById('v-age')!.textContent     = String(age);
      document.getElementById('v-ret')!.textContent     = String(ret);
      document.getElementById('v-contrib')!.textContent = fmt(contrib);
      document.getElementById('v-bal')!.textContent     = fmt(bal);
      document.getElementById('v-rate')!.textContent    = rate + '%';
      document.getElementById('v-tax')!.textContent     = tax + '%';
      document.getElementById('v-income')!.textContent  = fmt(income);

      const years = Math.max(1, ret - age);
      document.getElementById('hint-years')!.textContent = years + ' years of compounding growth.';

      const limit = age >= 50 ? 8600 : 7500;
      document.getElementById('warn-contrib')!.style.display = contrib > limit ? 'block' : 'none';

      const rothVal    = fv(bal, rate, years, contrib);
      const taxRate    = rate * (1 - tax/100);
      const taxableVal = fv(bal, taxRate, years, contrib);
      const diff       = rothVal - taxableVal;
      const diffPct    = Math.round((diff/taxableVal)*100);

      document.getElementById('r-roth')!.textContent      = fmt(rothVal);
      document.getElementById('r-taxable')!.textContent   = fmt(taxableVal);
      document.getElementById('r-advantage')!.textContent = fmt(diff);

      document.getElementById('adv-banner')!.innerHTML =
        `The Roth IRA leaves you <strong>${fmt(diff)}</strong> more at retirement — <strong>${diffPct}%</strong> ahead of a taxable account, thanks to ${years} years of tax-free compounding.`;

      const maxBar = Math.max(rothVal, taxableVal);
      document.getElementById('bar-roth')!.style.width     = Math.round((rothVal/maxBar)*100) + '%';
      document.getElementById('bar-taxable')!.style.width  = Math.round((taxableVal/maxBar)*100) + '%';
      document.getElementById('bar-roth-amt')!.textContent = fmtShort(rothVal);
      document.getElementById('bar-taxable-amt')!.textContent = fmtShort(taxableVal);

      const elig  = eligibility(income, filing);
      const badge = document.getElementById('elig-badge')!;
      badge.textContent = elig.label;
      badge.className   = 'elig-badge elig-' + elig.status;

      const years5  = Math.max(1, ret - (age + 5));
      const years10 = Math.max(1, ret - (age + 10));
      const val5    = fv(bal, rate, years5,  contrib);
      const val10   = fv(bal, rate, years10, contrib);
      const cost5   = rothVal - val5;
      const cost10  = rothVal - val10;

      document.getElementById('delay-5-cost')!.textContent = fmt(cost5);
      document.getElementById('delay-5-sub')!.textContent  = `less at retirement if you wait 5 years to start`;

      const maxDelay = Math.max(rothVal, val5, val10);
      document.getElementById('dbar-now')!.style.width = Math.round((rothVal/maxDelay)*100) + '%';
      document.getElementById('dbar-5')!.style.width   = Math.round((val5/maxDelay)*100) + '%';
      document.getElementById('dbar-10')!.style.width  = Math.round((val10/maxDelay)*100) + '%';

      document.getElementById('dbar-now-val')!.textContent = fmtShort(rothVal);
      document.getElementById('dbar-5-val')!.textContent   = fmtShort(val5);
      document.getElementById('dbar-10-val')!.textContent  = fmtShort(val10);

      document.getElementById('delay-note')!.textContent =
        `Starting today vs. 10 years later costs you ${fmt(cost10)} — almost ${Math.round(cost10/contrib)} years of contributions lost.`;
    }

    ['s-age','s-ret','s-contrib','s-bal','s-rate','s-tax','s-income','s-filing'].forEach(id => {
      document.getElementById(id)!.addEventListener('input', calc);
      document.getElementById(id)!.addEventListener('change', calc);
    });

    calc();
  }
}