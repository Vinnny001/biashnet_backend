import { ROLES } from "../config/constants.js";

import {
  userService
} from "../services/userService.js";

import {
  asyncHandler,
  forbidden,
  notFound
} from "../utils/errors.js";


export const userController = {

  /*
  =======================================================
  LIST USERS
  =======================================================
  */

  list: asyncHandler(async (req, res) => {

    const users =
      await userService.list(
        req.query
      );

    res.json({
      success: true,
      data: users
    });

  }),


  /*
  =======================================================
  CURRENT USER
  =======================================================
  */

  me: asyncHandler(async (req, res) => {

    const user =
      await userService.findById(
        req.auth.uid
      );


    if (!user) {
      throw notFound(
        "User profile not found."
      );
    }


    res.json({
      success: true,
      data: user
    });

  }),


  /*
  =======================================================
  GET USER
  =======================================================
  */

  get: asyncHandler(async (req, res) => {

    if (
      req.auth.role !== ROLES.ADMIN &&
      req.auth.uid !== req.params.id
    ) {
      throw forbidden();
    }


    const user =
      await userService.findById(
        req.params.id
      );


    if (!user) {
      throw notFound(
        "User not found."
      );
    }


    res.json({
      success: true,
      data: user
    });

  }),


  /*
  =======================================================
  CREATE
  =======================================================
  */

  create: asyncHandler(async (req, res) => {

    const user =
      await userService.create(
        req.body
      );

    res.status(201).json({
      success: true,
      data: user
    });

  }),


  /*
  =======================================================
  UPDATE USER
  =======================================================
  */

  update: asyncHandler(async (req, res) => {

    const user =
      await userService.update(
        req.params.id,
        req.body
      );

    res.json({
      success: true,
      data: user
    });

  }),


  /*
  =======================================================
  UPDATE MY PROFILE
  =======================================================
  */

  updateMe: asyncHandler(async (req, res) => {

    const user =
      await userService.update(
        req.auth.uid,
        req.body
      );

    res.json({
      success: true,
      data: user
    });

  }),


  /*
  =======================================================
  DELETE USER
  =======================================================
  */

  remove: asyncHandler(async (req, res) => {

    const result =
      await userService.remove(
        req.params.id
      );

    res.json({
      success: true,
      data: result
    });

  })

};