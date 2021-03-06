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
import angular = require('angular');
import _ = require('lodash');
import ApiService from '../../../services/api.service';
import UserService from "../../../services/user.service";

class ApiMembersController {
  private api: any;
  private members: any;
  private newPrimaryOwner: any;
  private groupMembers: any;
  private groupIdsWithMembers: any;
  private roles: any;
  private groupById: any;
  private displayGroups: any;
  constructor (
    private ApiService: ApiService,
    private resolvedApi,
    private resolvedMembers,
    private resolvedGroups,
    private $state,
    private $mdDialog: ng.material.IDialogService,
    private NotificationService,
    private $scope,
    private UserService,
    private GroupService,
    private RoleService
  ) {
    'ngInject';
    this.api = resolvedApi.data;
    this.members = resolvedMembers.data;
    this.newPrimaryOwner = null;
    this.$scope.searchText = "";
    this.groupById = _.keyBy(resolvedGroups, "id");
    this.displayGroups = {};
    _.forEach(resolvedGroups, (grp) => {
      this.displayGroups[grp.id] = false;
    });
    this.groupMembers = {};
    this.groupIdsWithMembers = [];
    if (this.api.groups) {
      let self = this;
      _.forEach(this.api.groups, (grp) => {
        GroupService.getMembers(grp).then((members) => {
          let filteredMembers = _.filter(members.data, (m: any) => {
            return m.roles["API"]
          });

          if (filteredMembers.length > 0) {
            self.groupMembers[grp] = filteredMembers;
            self.groupIdsWithMembers.push(grp)
          }
        });
      });
    }

    const that = this;
    RoleService.list('API').then(function (roles) {
      that.roles = roles;
    });
  }

  updateMember(member) {
    if (member.role) {
      this.ApiService.addOrUpdateMember(this.api.id, member).then(() => {
        this.NotificationService.show('Member ' + member.username + " has been updated with role " + member.role);
      });
    }
  }

  deleteMember(member) {
    var index = this.members.indexOf(member);
    this.ApiService.deleteMember(this.api.id, member.username).then(() => {
      this.members.splice(index, 1);
      this.NotificationService.show("Member " + member.username + " has been removed");
    });
  }

  isPrimaryOwner() {
    return this.UserService.currentUser.username === this.api.owner.username;
  }

  showAddMemberModal(ev) {
    this.$mdDialog.show({
      controller: 'DialogAddMemberApiController',
      template: require('./addMember.dialog.html'),
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        api: this.api,
        apiMembers: this.members
      }
    }).then((api) => {
      if (api) {
				this.ApiService.getMembers(api.id).then((response) => {
					this.members = response.data;
				});
      }
    }, function() {
      // You cancelled the dialog
    });
  }

  showPermissionsInformation() {
    this.$mdDialog.show({
      controller: 'DialogApiPermissionsHelpController',
      controllerAs: 'ctrl',
      template: require('./permissions.dialog.html'),
      parent: angular.element(document.body),
      clickOutsideToClose:true
    });
  }

	showDeleteMemberConfirm(ev, member) {
    ev.stopPropagation();
    let self = this;
    this.$mdDialog.show({
      controller: 'DialogConfirmController',
      controllerAs: 'ctrl',
      template: require('../../../components/dialog/confirm.dialog.html'),
      clickOutsideToClose: true,
      locals: {
        title: 'Would you like to remove the member ?',
        confirmButton: 'Remove'
      }
    }).then(function (response) {
      if (response) {
        self.deleteMember(member);
      }
    });
  }

  searchUser(query) {
    if (query) {
      return this.UserService.search(query).then((response) => {
        var usersFound = response.data;
        var filterUsers = _.filter(usersFound, (user:any) => {
          return _.findIndex(this.members,
              function(apiMember: any) {
                return apiMember.username === user.id && apiMember.type === 'primary_owner';
              }) === -1;
        });
        return filterUsers;
      });
    } else {
      var filterMembers = _.filter(this.members, function(member: any) { return member.type !== 'primary_owner'; });
      var members = _.flatMap(filterMembers, function(member: any) { return { 'id' : member.username}; });
      return members;
    }
  }

  selectedItemChange(item) {
    if (item) {
      this.newPrimaryOwner = item;
    } else {
      if (this.newPrimaryOwner !== null) {
        this.newPrimaryOwner = null;
      }
    }
  }

  showTransferOwnershipConfirm(ev) {
    this.$mdDialog.show({
      controller: 'DialogTransferApiController',
      template: require('./transferAPI.dialog.html'),
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true
    }).then((transferAPI) => {
      if (transferAPI) {
        this.transferOwnership();
      }
    }, () => {
      // You cancelled the dialog
    });
  }

  transferOwnership() {
      this.ApiService.transferOwnership(this.api.id, this.newPrimaryOwner.id).then(() => {
        this.NotificationService.show("API ownership changed !");
        this.$state.go(this.$state.current, {}, {reload: true});
    });
  }

  isAllowedToTransferOwnership() {
    return this.UserService.currentUser.isAdmin() || this.isPrimaryOwner();
  }
}

export default ApiMembersController;
