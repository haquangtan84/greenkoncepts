'use strict';

/* jasmine specs for controllers go here */
describe('Skills controller specifications', function() {
  beforeEach(function() {
    this.addMatchers({
      toEqualData : function(expected) {
        return angular.equals(this.actual, expected);
      }
    });
  });

  describe('SkillsCtrl', function() {
    var scope, ctrl, $httpBackend;

    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller) {
      $httpBackend = _$httpBackend_;
      $httpBackend.expectGET('/fbm/rest/skills').respond({
        status : true,
        result : [ {
          name : "Skill 1"
        }, {
          name : "Skill 2"
        }, ]
      });

      scope = $rootScope.$new();
      ctrl = $controller(SkillsCtrl, {
        $scope : scope
      });
    }));

    it('should create "skills" model with 2 skills fetched from xhr',
        function() {
          expect(scope.skills).toEqual([]);

          $httpBackend.flush();

          expect(scope.skills).toEqualData([ {
            name : "Skill 1"
          }, {
            name : "Skill 2"
          } ]);
        });

  });
});
