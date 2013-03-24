'use strict';

// Helper functions
function fillInFeedbackSkillsForm() {
  input("userReceivingFeedback.email").enter("some"+ new Date().getMilliseconds() +"@random.com");  
}    

function sendSkillsFeedback() {
  fillInFeedbackSkillsForm();
  sleep(3);
  element('#a-send-feedback').click();
}

function fillinInvitationForm() {
  input('user.firstname').enter("Some Random Name " + new Date().getMilliseconds());
  input('user.email').enter("some"+ new Date().getMilliseconds() +"@random.com");
}

function sendInviteFromInvitationForm() {
  fillinInvitationForm();
  sleep(3);
  element('#button-send').click();
  sleep(3);
}

function fillInSignInForm(username, password) {
  input('user.login').enter(username);
  input('user.password').enter(password);
}

function signInWithCredentials(username, password) {
  fillInSignInForm(username, password);
  
  element('button[class="btn btn-primary"]').click();
}

function fillInSignUpForm() {
  input('user.firstName').enter("Some Random First Name " + new Date().getMilliseconds());
  input('user.lastName').enter("Some Random Last Name " + new Date().getMilliseconds());
  input('user.email').enter("some"+ new Date().getMilliseconds() +"@random.com");
  input('user.password').enter(""+ new Date().getMilliseconds() +"");
  sleep(2);
}

function signUpForNewAccount() {
  fillInSignUpForm();

  element('button[class="btn"]').click();
}
  
describe('FBM App', function() {
  var indexPage = '../../index.html';
  it('should redirect index.html to index.html#/home', function() {
    browser().navigateTo(indexPage);
    expect(browser().location().url()).toBe('/home');
  });

  describe('Send Feedback view', function() {

    beforeEach(function() {
      browser().navigateTo(indexPage + '#/sendFeedback');
    });


    it('should display the list of users', function() {
      expect(repeater('.users li').count()).toBeGreaterThan(0);
    });
  });


  describe('Add skill view when user is not logged', function() {

    beforeEach(function() {
      browser().navigateTo(indexPage + '#/skills');
    });


    it('should display that user is not logged and not skill form', function() {
      expect(element('#userNotLoggedNotice:visible').count()).toEqual(1);
      expect(element('#addSkillForm:hidden').count()).toEqual(1);
    });
  });

  describe('User is going to sign in', function() {
    
    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
    });

    it('should be on sign in page', function() {
      expect(browser().location().url()).toBe('/signin');
    });    

  });

  describe('User is entering cridentials', function() {
      
    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
      
      fillInSignInForm('test.user', '123');
    });   

    it('should have populated sign in form', function() {
      expect(input('user.login').val()).toEqual('test.user');
      expect(input('user.password').val()).toEqual('123');      
    });  
    
  });

  describe('User is logging in with WRONG cridentials', function() {

    beforeEach(function() {       
      //TO DO: make sure that user is logged out
      // sleep(5); // can help to log out manually in runner
      browser().navigateTo("http://localhost:8124/#/signin");
    
      signInWithCredentials('wrong.username', 'wrong.password');
    });   

    it('should stay on SignIn page if log in failed', function() {
      expect(browser().location().url()).toBe('/signin');
    });

    // it('should have error message on page', function() {
    // });    

  });

  describe('User is logging in with ACTUAL cridentials', function() {
      
    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
      
      signInWithCredentials('denis.volokh@gmail.com', 'den20001');      
    });   

    it('should land on HOME page if successfully logged in', function() {
      expect(browser().location().url()).toBe('/home');
    });

    it('should have visible navigation container', function() {
      // expect(element('div[ng-show="root.isUserLogged"').css('display')).not().toEqual('none');
      expect(element('div[ng-show="root.isUserLogged" style="display: none;"').count()).toEqual(0);
    });

  });    

  describe('Appearance of invitation form on every page after successful log in', function() {
      
    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
      
      signInWithCredentials('denis.volokh@gmail.com', 'den20001');      
    });   

    it('should have invitation form on Profile page', function() {
      browser().navigateTo(indexPage + "#/user");      
      expect(element('#invitation').count()).toEqual(1);
    });    

    it('should have invitation form on Skills page', function() {
      browser().navigateTo(indexPage + "#/skills");
      expect(element('#invitation').count()).toEqual(1);
    });

    it('should have invitation form on Connections page', function() {
      browser().navigateTo(indexPage + "#/connections");      
      expect(element('#invitation').count()).toEqual(1);
    });    
  });    

  describe("Test for sending Invitation from Skills page", function() {
    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
      
      signInWithCredentials('denis@denis.com', 'denis');  
      browser().navigateTo(indexPage + "#/skills");    
      sleep(3);
      sendInviteFromInvitationForm();

      browser().navigateTo(indexPage + "#/emails");          
      sleep(5);
    });   

    it("should have 1 email in Outcoming emails", function() {
      expect(element('#emails li').count()).toEqual(1);
    });  
  });

  describe("Send Feedback to non-registered user", function() {

    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signin");
      
      signInWithCredentials('denis@denis.com', 'denis');  
      browser().navigateTo(indexPage + "#/skills/sendFeedback");    
      
      sendSkillsFeedback(); //send feedback to non-register user

      browser().navigateTo(indexPage + "#/emails");          
      sleep(2);
    });

    it("should have 1 email in Outcoming emails", function() {
        expect(element('#emails li').count()).toEqual(1);
    });           
  });

  describe("Register new user", function() {

    beforeEach(function() { 
      browser().navigateTo(indexPage + "#/signup");
      
      signUpForNewAccount();
      sleep(2);
    });

    it("should reroute user to signin page", function() {
        expect(browser().location().url()).toBe('/signin');
    });           
  });

  // TODO : see how to add end2end test when user is logged
  // TODO : add e2e tests to check user login & signin
});
