/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import AuthenticationService from '../../services/authentication.service';
import UserService from '../../services/user.service';
import {IScope} from 'angular';

class LoginController {
  user: any = {};
  userCreationEnabled: boolean;

  private providers: {
    id: string;
    name: string;
    icon: string
  }[];

  constructor(
    private UserService: UserService,
    private $state: ng.ui.IStateService,
    Constants,
    private $rootScope: IScope,
    private AuthenticationService: AuthenticationService
  ) {
    'ngInject';
    this.userCreationEnabled = Constants.userCreationEnabled;
    this.$state = $state;
    this.$rootScope = $rootScope;
    this.providers = AuthenticationService.getProviders();
  }

  authenticate(provider: string) {
    const that = this;

    this.AuthenticationService.authenticate(provider)
      .then(function() {
        that.$rootScope.$broadcast('graviteeUserRefresh');
        that.$state.go('portal.home');
      })
      .catch(function() {
      });
  };

  login($event: Event) {
    $event.preventDefault();
    const that = this;
    this.UserService.login(this.user).then(() => {
      that.$rootScope.$broadcast('graviteeUserRefresh');
      that.$state.go('portal.home');
    }).catch(() => {
      this.user.username = '';
      this.user.password = '';
    });
  }
}

export default LoginController;
