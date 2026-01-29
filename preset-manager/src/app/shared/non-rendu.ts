import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appNonRendu]'
})
export class NonRendu {

  constructor(e : ElementRef) {
    const el : HTMLElement = e.nativeElement;
    el.style.color = "red";
    el.style.fontWeight = "bold"
  }

}
