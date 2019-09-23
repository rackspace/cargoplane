import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ChatComponent} from './chat/chat.component';
import {ChatLineComponent} from './chat/chat-line.component';
import {ChatWindowComponent} from './chat/chat-window.component';
import {CargoplaneClient} from '@cargoplane/client';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    ChatWindowComponent,
    ChatLineComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [
    /** Event though it isn't annotated @Injectable, this works! */
    CargoplaneClient
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
