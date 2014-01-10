<div class="map-section">
	<section class="featured footer map">
		<div class="container">
			<div class="row">
				<div class="span6">
          <h2>Latest <strong>Blog</strong> Posts</h2>
					<div class="recent-posts">
				    <?php echo views_embed_view('latest_posts', 'block');?>	
					</div>
				</div>
				<div class="span6">
					<h2><strong>What</strong> Client’s Say</h2>
					<?php echo views_embed_view('testimonials', 'block');?>	
				</div>	
			</div>
		</div>
	</section>
</div>