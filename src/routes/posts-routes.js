"use strict";

const express = require('express');
const {Posts} = require('../models');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/:id', (req, res) => {
	Posts.findById(req.params.id).exec().then(post => res.json(post.apiRepr()))
    .catch(err => {
      console.error(err);
        res.status(500).json({message: 'Internal server error'})
    });
});

router.get('/', (req, res) => {
	Posts.find().exec().then(posts => {
		//console.log(posts);
		res.json({
			posts: posts.map(
				(post) => post.apiRepr())
		});
	})
	.catch(
      err => {
        console.error(err);
        res.status(500).json({message: 'Internal server error'});
    });
});

router.post('/', jsonParser, (req, res) => {
	const requiredFields = ['title', 'content', 'author'];
	for (let i=0; i < requiredFields.length; i++) {
		if(!(requiredFields[i] in req.body)) {
			const msg = `Missing ${field} in request body`;
			//console.log(msg);
			return res.satus(400).send(msg);
		}
	}
	Posts.create({
		title: req.body.title,
		content: req.body.content,
		author: req.body.author,
		created: req.body.created})
		.then(post => res.status(201).json(post.apiRepr()))
		.catch(err => {
			console.error(err);
			res.status(500).json({message: 'Internal serve error'});
    });
});

router.delete('/:id', (req, res) => {
	Posts.findByIdAndRemove(req.params.id)
    .exec()
    .then(() => {
		console.log(`Deleting blogpost ${req.params.id}`);
		res.status(204).end();
	})
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

router.put('/:id', jsonParser, (req, res) => {
	if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		res.status(400).json({
		error: 'Request path id and request body id values must match'
		});
	}
  const updated = {};
  const updateableFields = ['title', 'content', 'author'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  Posts
    .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
    .exec()
    .then(updatedPost => res.status(201).json(updatedPost.apiRepr()))
    .catch(err => res.status(500).json({message: 'Something went wrong'}));
});

module.exports = router;