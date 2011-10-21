require 'test_helper'

class SessionsControllerTest < ActionController::TestCase

  def test_should_login_and_redirect
    post :create, :login => 'greeter', :password => 'test'
    assert session[:user_id]
    assert_response :redirect
    assert_redirected_to '/sfbk'
  end

  def test_should_fail_login_and_not_redirect
    post :create, :login => 'greeter', :password => 'bad password'
    assert_nil session[:user_id]
    assert_response :success
  end

  def test_should_logout
    login_as :greeter
    get :destroy
    assert_nil session[:user_id]
    assert_response :redirect
  end

  def test_should_remember_me
    post :create, :login => 'greeter', :password => 'test', :remember_me => "1"
    assert_not_nil @response.cookies["auth_token"]
  end

  def test_should_not_remember_me
    post :create, :login => 'greeter', :password => 'test', :remember_me => "0"
    assert_nil @response.cookies["auth_token"]
  end

  def test_should_delete_token_on_logout
    login_as :greeter
    get :destroy
    assert_nil @response.cookies["auth_token"]
  end

  def test_should_login_with_cookie
    users(:greeter).remember_me
    @request.cookies["auth_token"] = cookie_for(:greeter)
    get :new
    assert @controller.send(:logged_in?)
  end

  def test_should_fail_expired_cookie_login
    users(:greeter).remember_me
    users(:greeter).update_attribute :remember_token_expires_at, 5.minutes.ago
    @request.cookies["auth_token"] = cookie_for(:greeter)
    get :new
    assert !@controller.send(:logged_in?)
  end

  def test_should_fail_cookie_login
    users(:greeter).remember_me
    @request.cookies["auth_token"] = auth_token('invalid_auth_token')
    get :new
    assert !@controller.send(:logged_in?)
  end

  protected
    def auth_token(token)
      CGI::Cookie.new('name' => 'auth_token', 'value' => token)
    end

    def cookie_for(user)
      auth_token users(user).remember_token
    end
end
