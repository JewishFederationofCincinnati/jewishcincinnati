<?php

/**
 * @file
 * Documents hooks provided by the ACSF Duplication module.
 */

/**
 * Alters the counts reported by `drush acsf-duplication-scrub-progress`.
 *
 * @param array $data
 *   An associative array of counts representing the total number of items
 *   remaining to scrub, keyed by [type]_count.
 *
 * @see drush_acsf_duplication_scrub_progress()
 */
function hook_acsf_duplication_scrub_remaining_counts_alter(&$data) {
  $data['node_count'] = AcsfDuplicationScrubNodeHandler::countRemaining();
}

/**
 * Alters the scrub event context of `drush acsf-duplication-scrub-batch`.
 *
 * Use this alter hook to add optional data to the scrub event. The data added
 * here is available via the $this->event->context array in event handlers.
 *
 * @param array $context
 *   An associative array of context data needed in the event handlers.
 *
 * @see drush_acsf_duplication_scrub_batch()
 */
function hook_acsf_duplication_scrub_context_alter(&$context) {
  $context['scrub_options']['retain_users'] = drush_get_option('exact-copy');
  $context['scrub_options']['retain_content'] = drush_get_option('exact-copy');
}

/**
 * Alters the list of admin roles of users to preserve.
 *
 * @param array $admin_roles
 *   An indexed array of admin roles of users to preserve.
 *
 * @see AcsfDuplicationScrubUserHandler::getOpenIdAdmins()
 */
function hook_acsf_duplication_scrub_admin_roles_alter(&$admin_roles) {
  if ($role = variable_get('my_module_admin_role')) {
    $admin_roles[] = $role;
  }
}

/**
 * Alters the list of user IDs to preserve.
 *
 * @param array $preserved_uids
 *   An indexed array of user IDs to preserve.
 *
 * @see AcsfDuplicationScrubUserHandler::getPreservedUsers()
 */
function hook_duplication_acsf_duplication_scrub_preserved_users_alter(&$preserved_uids) {
  if ($uids = variable_get('my_module_preserved_uids', array())) {
    $preserved_uids = array_merge($preserved_uids, $uids);
  }
}

