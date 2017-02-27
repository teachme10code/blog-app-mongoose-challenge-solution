const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const should = chai.should();

const {Posts} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function tearDownDb() {
  return new Promise((resolve, reject) => {
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err))
  });
}

function seedPostsData() {
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  return Posts.insertMany(seedData);
}

describe('blog posts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedPostsData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(_res => {
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body['posts'].should.have.length.of.at.least(1);

          return Posts.count();
        })
        .then(count => {
          res.body['posts'].should.have.length.of(count);
        });
    });

    it('should return posts with right fields', function() {
      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {

          res.should.have.status(200);
          res.should.be.json;
          res.body['posts'].should.be.a('array');

          res.body['posts'].forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys('id', 'title', 'content', 'author', 'created');
          });

          resPost = res.body['posts'];
          return Posts.findById(resPost[0].id).exec();
        })
        .then(post => {
          resPost[0].title.should.equal(post.title);
          resPost[0].content.should.equal(post.content);
          resPost[0].author.should.equal(post.authorName);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {

      const newPost = {
          title: faker.lorem.sentence(),
          author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
          },
          content: faker.lorem.text()
      };

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newPost.title);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.author.should.equal(
            `${newPost.author.firstName} ${newPost.author.lastName}`);
          res.body.content.should.equal(newPost.content);
          return Posts.findById(res.body.id).exec();
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
      const updateData = {
        title: 'cats cats cats',
        content: 'dogs dogs dogs',
        author: {
          firstName: 'foo',
          lastName: 'bar'
        }
      };
      return Posts
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(res => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.title.should.equal(updateData.title);
          res.body.author.should.equal(
            `${updateData.author.firstName} ${updateData.author.lastName}`);
          res.body.content.should.equal(updateData.content);

          return Posts.findById(res.body.id).exec();
        })
        .then(post => {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
          post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('should delete a post by id', function() {

      let post;

      return Posts
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(res => {
          res.should.have.status(204);
          return Posts.findById(post.id);
        })
        .then(_post => {
          should.not.exist(_post);
        });
    });
  });
});