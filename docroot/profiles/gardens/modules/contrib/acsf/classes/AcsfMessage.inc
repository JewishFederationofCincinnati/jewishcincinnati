<?php

/**
 * @file
 * AcsfMessage defines a basic message interface between a Drupal site and the Site
 * Factory. It is composed of a AcsfConfig compatible object which defines the
 * location and credentials required to communicate with the Site Factory. There
 * is one abstract method, which client code must implement: sendMessage(). This
 * method is responsible for implementing the communication and returning an
 * AcsfResponse object. This ensures that the client code has predictable input and
 * output.
 *
 * Invocation is simple, the following shows a working example of communicating
 * via XMLRPC (using the AcsfMessageXmlRpc concrete class). Construction can be as
 * simple as providing an endpoint and parameters. Additional arguments may be
 * provided to customize the behavior - namely locating a special config file or
 * providing an anonymous callback function.
 *
 * $m = new AcsfMessageXmlRpc('acquia.gardens.phone.home', array(406));
 * $m->send();
 * $m->getResponseCode();
 * $m->getResponseBody();
 */

class AcsfMessageFailedResponseException extends exception {}

class AcsfMessageEmptyResponseException extends exception {}

class AcsfMessageMalformedResponseException extends exception {}

class AcsfMessageMissingCredsException extends Exception {}

class AcsfMessageFailureException extends Exception {}

abstract class AcsfMessage {

  // The message endpoint on the remote server.
  protected $endpoint;

  // An unstructured list of parameters to send with the request.
  protected $parameters;

  // The AcsfMessageResponse object.
  protected $response;

  // An optional Acquia Hosting sitegroup.
  protected $ah_site;

  // An optional Acquia Hosting environment.
  protected $ah_env;

  // An optional AcsfConfig object.
  private $config;

  /**
   * Constructor
   *
   * @param String $endpoint
   *   The endpoint to contact on the remote server.
   * @param Array $parameters
   *   The list of parameters to send with the request.
   * @param AcsfConfig $config
   *   (Optional) The configuration option.
   * @param String $ah_site
   *   (Optional) The Acquia Hosting sitegroup.
   * @param String $ah_env
   *   (Optional) The Acquia Hosting environment.
   * @param Closure $callback
   *   (Optional) An anonymous callback function.
   */
  public function __construct($endpoint, $parameters = NULL, AcsfConfig $config = NULL, $ah_site = NULL, $ah_env = NULL, Closure $callback = NULL) {

    // Use our default config if not specified.
    if (empty($config)) {
      $config = new AcsfConfigDefault($ah_site, $ah_env);
    }

    // Ensure that the config class is compatible.
    if (!is_subclass_of($config, 'AcsfConfig')) {
      throw new AcsfMessageMissingCredsException('The config argument must contain an AcsfConfig compatible class file.');
    }

    $this->config = $config;
    $this->endpoint = $endpoint;
    $this->parameters = $parameters;
    $this->ah_site = $ah_site;
    $this->ah_env = $ah_env;
    $this->callback = $callback;
  }

  /**
   * Sends the message to the remote server.
   */
  public function send() {
    $this->response = $this->sendMessage($this->config->getUrl(), $this->endpoint, $this->parameters, $this->config->getUsername(), $this->config->getPassword());

    // Don't allow empty responses.
    if (empty($this->response)) {
      throw new AcsfMessageEmptyResponseException(sprintf('The message to %s resulted in an empty response.', $this->endpoint));
    }

    // Only allow AcsfMessageResponse compatible responses.
    if (!is_subclass_of($this->response, 'AcsfMessageResponse')) {
      throw new AcsfMessageMalformedResponseException(sprintf('The message to %s resulted in a malformed response. It should be an AcsfMessageResponse object.', $this->endpoint));
    }

    // Ask the response if it is failed.
    if ($this->response->failed()) {
      throw new AcsfMessageFailedResponseException(sprintf('The response from %s failed.', $this->endpoint));
    }

    // Allow the implementer to respond right away.
    $this->receiveResponse($this->response);

    // Allow an anonymous callback.
    if (!empty($this->callback)) {
      try {
        $callback = $this->callback;
        $callback($this->response);
      }
      catch (Exception $e) {
        // @todo log here?
      }
    }
  }

  /**
   * Allows client code to optionally run logic after the response is received.
   */
  protected function receiveResponse(AcsfMessageResponse $response) {

  }

  /**
   * Retrieves the response body.
   *
   * @return Unknown
   */
  public function getResponseBody() {
    if (empty($this->response)) {
      return FALSE;
    }
    return $this->response->body;
  }

  /**
   * Retrieves the response code.
   *
   * @return Unknown
   */
  public function getResponseCode() {
    if (empty($this->response)) {
      return FALSE;
    }
    return $this->response->code;
  }

  /**
   * Sends a message to a remote server and implements a response object.
   *
   * @param String $url
   *   The URL of the remote service.
   * @param String $endpoint
   *   The endpoint to call on the remote service.
   * @param Array $parameters
   *   Parameters to send with the request.
   * @param String $username
   *   The remote username.
   * @param String $password
   *   The remote password.
   *
   * @return AcsfMessageResponse
   */
  abstract protected function sendMessage($url, $endpoint, $parameters, $username, $password);

}
